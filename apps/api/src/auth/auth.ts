import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

export interface SessionUser {
  id: string;
  email: string;
  nickname: string | null;
  isAdmin: boolean;
}

export const SESSION_COOKIE = 'zz_session';
const SESSION_DAYS = 30;
const REFRESH_WITHIN_DAYS = 7; // 만료가 이 안으로 들어오면 요청 때 쿠키를 새로 발급 (슬라이딩)

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET 미설정');
  return s;
};
const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

/** 서명 쿠키 토큰. DB 세션 테이블 없이 사용자 정보를 그대로 담는다 (ponytail: 강제 로그아웃 필요해지면 세션 테이블) */
export function issueToken(user: Omit<SessionUser, 'isAdmin'>, exp = Date.now() + SESSION_DAYS * 86_400_000): string {
  const payload = Buffer.from(JSON.stringify({ ...user, exp })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): SessionUser | null {
  return decodeToken(token)?.user ?? null;
}

function decodeToken(token: string | undefined): { user: SessionUser; exp: number } | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { id, email, nickname, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionUser & { exp: number };
    if (Date.now() > exp) return null;
    return { user: { id, email, nickname, isAdmin: isAdminEmail(email) }, exp };
  } catch {
    return null;
  }
}

export const isAdminEmail = (email: string) =>
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());

export function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

/**
 * 브라우저가 보는 origin. 호스트 nginx가 X-Forwarded-Proto/Host를 붙이고, dev는 vite 프록시가 Host를 그대로 넘긴다.
 * env로 고정하면 배포 환경마다 틀어지기 쉬워 요청에서 읽는다
 */
export function requestOrigin(req: Request): string {
  const proto = (req.get('x-forwarded-proto') ?? req.protocol).split(',')[0].trim();
  const host = req.get('x-forwarded-host') ?? req.get('host');
  return `${proto}://${host}`;
}

export const cookieOptions = (req: Request, maxAgeMs: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: requestOrigin(req).startsWith('https'),
  path: '/',
  maxAge: maxAgeMs,
});

export const setSession = (req: Request, res: Response, user: Omit<SessionUser, 'isAdmin'>) =>
  res.cookie(SESSION_COOKIE, issueToken(user), cookieOptions(req, SESSION_DAYS * 86_400_000));

export const currentUser = (req: Request): SessionUser | null => verifyToken(readCookie(req, SESSION_COOKIE));

/** 유효한 세션이 만료 7일 안이면 30일짜리로 재발급. 쓰는 동안은 안 끊기게. 갱신했으면 true */
export function refreshSessionIfNeeded(req: Request, res: Response): boolean {
  const d = decodeToken(readCookie(req, SESSION_COOKIE));
  if (!d || d.exp - Date.now() > REFRESH_WITHIN_DAYS * 86_400_000) return false;
  setSession(req, res, d.user);
  return true;
}

/** 컨트롤러 인자용. 로그인 안 했으면 null (가드와 조합해 필수 여부 결정) */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => currentUser(ctx.switchToHttp().getRequest<Request>()));

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    if (!currentUser(ctx.switchToHttp().getRequest<Request>())) throw new UnauthorizedException('로그인 필요');
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const user = currentUser(ctx.switchToHttp().getRequest<Request>());
    if (!user) throw new UnauthorizedException('로그인 필요');
    if (!user.isAdmin) throw new ForbiddenException('어드민 권한 없음');
    return true;
  }
}
