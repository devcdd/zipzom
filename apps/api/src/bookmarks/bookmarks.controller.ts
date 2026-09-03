import { Controller, Delete, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, type SessionUser } from '../auth/auth.js';
import { Db } from '../db.js';
import { MatchingService } from '../matching/matching.service.js';
import { NoticesService } from '../notices/notices.service.js';
import { ProfilesService } from '../profiles/profiles.service.js';

@Controller('bookmarks')
@UseGuards(AuthGuard)
export class BookmarksController {
  constructor(
    private readonly db: Db,
    private readonly notices: NoticesService,
    private readonly profiles: ProfilesService,
    private readonly matching: MatchingService,
  ) {}

  @Get()
  async ids(@CurrentUser() user: SessionUser) {
    const rows = await this.db.query<{ notice_id: number }>(`select notice_id from user_bookmarks where user_id = $1`, [user.id]);
    return { noticeIds: rows.map((r) => r.notice_id) };
  }

  /**
   * 마감된 공고도 포함 — 북마크는 지난 공고 참고용으로도 쓴다.
   * 서버에 프로필이 있으면 내 매칭과 같은 판정을 붙여 준다 (matchedCodes). 없으면 빈 배열
   */
  @Get('notices')
  async list(@CurrentUser() user: SessionUser) {
    const { noticeIds } = await this.ids(user);
    if (noticeIds.length === 0) return { total: 0, items: [] };
    const { total, items } = await this.notices.list({ ids: noticeIds, limit: 200, offset: 0 });
    const profile = await this.profiles.get(user.id);
    if (!profile) return { total, items: items.map((n) => ({ ...n, matchedCodes: [] as string[], noticeSpecific: false })) };
    const { matches } = await this.matching.annotate(profile, items);
    return { total, items: matches.map((m) => ({ ...m.notice, matchedCodes: m.codes, noticeSpecific: m.overridden })) };
  }

  @Put(':noticeId')
  async add(@CurrentUser() user: SessionUser, @Param('noticeId', ParseIntPipe) noticeId: number) {
    await this.db.query(`insert into user_bookmarks (user_id, notice_id) values ($1, $2) on conflict do nothing`, [user.id, noticeId]);
    return { ok: true };
  }

  @Delete(':noticeId')
  async remove(@CurrentUser() user: SessionUser, @Param('noticeId', ParseIntPipe) noticeId: number) {
    await this.db.query(`delete from user_bookmarks where user_id = $1 and notice_id = $2`, [user.id, noticeId]);
    return { ok: true };
  }
}
