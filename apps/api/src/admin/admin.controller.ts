import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/auth.js';
import { z } from 'zod';
import { Db } from '../db.js';
import { ExtractionService } from '../sync/extraction.service.js';
import { extractedHouseSchema } from '../sync/house-extractor.js';
import { SyncService } from '../sync/sync.service.js';
import { parse } from '../validate.js';

const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ADMIN_EMAILS에 있는 카카오 계정만
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly db: Db,
    private readonly sync: SyncService,
    private readonly extraction: ExtractionService,
  ) {}

  private async tableNames(): Promise<string[]> {
    const rows = await this.db.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`,
    );
    return rows.map((r) => r.table_name);
  }

  @Get('tables')
  async tables() {
    const names = await this.tableNames();
    return Promise.all(
      names.map(async (name) => ({ name, rows: (await this.db.one<{ c: number }>(`select count(*)::int as c from "${name}"`))!.c })),
    );
  }

  /** 테이블명은 information_schema 목록과 대조한 뒤에만 식별자로 삽입한다. */
  @Get('tables/:name')
  async rows(@Param('name') name: string, @Query() query: Record<string, string>) {
    const { limit, offset } = parse(pageSchema, query);
    if (!(await this.tableNames()).includes(name)) throw new NotFoundException(`unknown table ${name}`);
    const [columns, rows, total] = await Promise.all([
      this.db.query<{ name: string; type: string }>(
        `select column_name as name, data_type as type from information_schema.columns
         where table_schema = 'public' and table_name = $1 order by ordinal_position`,
        [name],
      ),
      this.db.query(`select * from "${name}" order by 1 desc limit $1 offset $2`, [limit, offset]),
      this.db.one<{ c: number }>(`select count(*)::int as c from "${name}"`),
    ]);
    return { columns, rows, total: total!.c };
  }

  @Post('sync')
  runSync() {
    return this.sync.runAll();
  }

  @Get('extractions')
  extractions() {
    return this.extraction.list();
  }

  /** 검수 화면에서 고친 표를 그대로 받아 반영한 뒤, 새 단지 좌표를 바로 찍는다. */
  @Post('extractions/:noticeId/approve')
  async approve(@Param('noticeId', ParseIntPipe) noticeId: number, @Body() body: unknown) {
    const { houses } = parse(z.object({ houses: z.array(extractedHouseSchema).min(1) }), body);
    await this.extraction.approve(noticeId, houses);
    return this.sync.geocodeMissing();
  }

  @Post('extractions/:noticeId/reject')
  async reject(@Param('noticeId', ParseIntPipe) noticeId: number) {
    await this.extraction.reject(noticeId);
    return { ok: true };
  }

  @Post('extractions/:noticeId/retry')
  async retry(@Param('noticeId', ParseIntPipe) noticeId: number) {
    await this.extraction.retry(noticeId);
    return { ok: true };
  }
}
