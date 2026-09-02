import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, type SessionUser } from '../auth/auth.js';
import { parse } from '../validate.js';
import { ProfilesService, profileSchema } from './profiles.service.js';

/** 로그인 사용자 전용. 비로그인 프로필은 브라우저 localStorage에만 있고 서버는 모른다 */
@Controller('profiles')
@UseGuards(AuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get('me')
  async get(@CurrentUser() user: SessionUser) {
    return (await this.profiles.get(user.id)) ?? null;
  }

  @Put('me')
  update(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    return this.profiles.upsert(user.id, parse(profileSchema, body));
  }
}
