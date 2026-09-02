import { BadRequestException, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { Db } from '../db.js';
import { cookieOptions, CurrentUser, readCookie, requestOrigin, SESSION_COOKIE, setSession, type SessionUser } from './auth.js';

const STATE_COOKIE = 'zz_oauth_state';
// 카카오 콘솔에 등록한 Redirect URI와 글자 단위로 같아야 한다 (dev: localhost:5173, 운영: 도메인)
const redirectUri = (req: Request) => `${requestOrigin(req)}/api/auth/kakao/callback`;

@Controller('auth')
export class AuthController {
  constructor(private readonly db: Db) {}

  @Get('me')
  me(@CurrentUser() user: SessionUser | null) {
    return user ?? { id: null };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  /** 카카오 인가 페이지로. state는 CSRF 방지용 1회성 쿠키 */
  @Get('kakao')
  kakao(@Req() req: Request, @Res() res: Response) {
    const state = randomBytes(16).toString('base64url');
    res.cookie(STATE_COOKIE, state, cookieOptions(req, 10 * 60_000));
    const url = new URL('https://kauth.kakao.com/oauth/authorize');
    url.search = new URLSearchParams({
      client_id: process.env.KAKAO_REST_API_KEY!,
      redirect_uri: redirectUri(req),
      response_type: 'code',
      state,
    }).toString();
    res.redirect(url.toString());
  }

  @Get('kakao/callback')
  async callback(@Req() req: Request, @Res() res: Response, @Query('code') code?: string, @Query('state') state?: string, @Query('error') error?: string) {
    if (error) return res.redirect(`${requestOrigin(req)}/#/?login=denied`);
    if (!code || !state || state !== readCookie(req, STATE_COOKIE)) throw new BadRequestException('잘못된 로그인 요청');
    res.clearCookie(STATE_COOKIE, { path: '/' });

    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.KAKAO_REST_API_KEY!,
      redirect_uri: redirectUri(req),
      code,
    });
    if (process.env.KAKAO_CLIENT_SECRET) form.set('client_secret', process.env.KAKAO_CLIENT_SECRET);
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(10_000),
    });
    const token = (await tokenRes.json()) as { access_token?: string; error_description?: string };
    if (!tokenRes.ok || !token.access_token) throw new BadRequestException(`kakao token: ${token.error_description ?? tokenRes.status}`);

    const meRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const me = (await meRes.json()) as { id: number; kakao_account?: { email?: string; profile?: { nickname?: string } } };
    const email = me.kakao_account?.email;
    // 이메일은 필수 동의 항목. 없으면 사용자를 식별·어드민 판정할 수 없다
    if (!meRes.ok || !email) throw new BadRequestException('카카오 계정 이메일을 받지 못했어요');

    const user = (await this.db.one<{ id: string; email: string; nickname: string | null }>(
      `insert into users (kakao_id, email, nickname) values ($1, $2, $3)
       on conflict (kakao_id) do update set email = excluded.email, nickname = excluded.nickname
       returning id, email, nickname`,
      [String(me.id), email, me.kakao_account?.profile?.nickname ?? null],
    ))!;
    setSession(req, res, user);
    res.redirect(`${requestOrigin(req)}/#/`);
  }
}

