import { Controller, Delete, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, type SessionUser } from '../auth/auth.js';
import { Db } from '../db.js';
import { NoticesService } from '../notices/notices.service.js';

@Controller('bookmarks')
@UseGuards(AuthGuard)
export class BookmarksController {
  constructor(
    private readonly db: Db,
    private readonly notices: NoticesService,
  ) {}

  @Get()
  async ids(@CurrentUser() user: SessionUser) {
    const rows = await this.db.query<{ notice_id: number }>(`select notice_id from user_bookmarks where user_id = $1`, [user.id]);
    return { noticeIds: rows.map((r) => r.notice_id) };
  }

  /** 마감된 공고도 포함 — 북마크는 지난 공고 참고용으로도 쓴다 */
  @Get('notices')
  async list(@CurrentUser() user: SessionUser) {
    const { noticeIds } = await this.ids(user);
    if (noticeIds.length === 0) return { total: 0, items: [] };
    return this.notices.list({ ids: noticeIds, limit: 200, offset: 0 });
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
