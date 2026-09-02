import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, CurrentUser, type SessionUser } from '../auth/auth.js';
import { parse } from '../validate.js';
import { ProfilesService, profileSchema } from './profiles.service.js';

const localOnlySchema = z.object({ localOnly: z.literal(true), birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/** 로그인 사용자 전용. 비로그인 프로필은 브라우저 localStorage에만 있고 서버는 모른다 */
@Controller('profiles')
@UseGuards(AuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get('me')
  get(@CurrentUser() user: SessionUser) {
    return this.profiles.getMe(user.id);
  }

  /** body.localOnly === true 면 생년월일만 저장하고 나머지 조건은 서버에서 지운다 */
  @Put('me')
  async update(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    if ((body as { localOnly?: unknown })?.localOnly === true) {
      const { birthDate } = parse(localOnlySchema, body);
      return this.profiles.setLocalOnly(user.id, birthDate);
    }
    const profile = await this.profiles.upsert(user.id, parse(profileSchema, body));
    return { localOnly: false, birthDate: null, profile };
  }
}
