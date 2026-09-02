import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/auth.js';
import { z } from 'zod';
import { Db } from '../db.js';
import { ExtractionService } from '../sync/extraction.service.js';
import { extractedEligibilitySchema, extractedHouseSchema } from '../sync/house-extractor.js';
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

  /** 즉시 응답하고 서버가 끝까지 돈다 (추출까지 수십 분). 진행 상황은 sync/last 폴링 */
  @Post('sync')
  runSync() {
    const started = !this.sync.isRunning;
    void this.sync.runAll().catch(() => {});
    return { started, running: true };
  }

  /** 소스별 마지막 실행 + 전체 실행 중 여부. 추출·지오코딩은 sync_runs에 안 남으니 running으로 판단 */
  @Get('sync/last')
  async lastSync() {
    const runs = await this.db.query(
      `select distinct on (source) source, started_at as "startedAt", finished_at as "finishedAt", fetched, upserted, error
       from sync_runs order by source, started_at desc`,
    );
    return { running: this.sync.isRunning, runs };
  }

  /** 자동 병합된 중복 공고 쌍. 대표(canonical)만 목록에 노출되고 duplicate는 숨겨진 상태다. */
  @Get('duplicates')
  duplicates() {
    return this.db.query(
      `select d.id, d.source, d.source_id as "sourceId", d.title, d.posted_on::text as "postedOn", d.detail_url as "detailUrl",
         c.id as "canonicalId", c.source as "canonicalSource", c.title as "canonicalTitle",
         c.posted_on::text as "canonicalPostedOn", c.detail_url as "canonicalDetailUrl",
         (select count(*)::int from notice_houses h where h.notice_id = c.id) as "canonicalHouseCount"
       from notices d join notices c on c.id = d.duplicate_of
       order by c.posted_on desc nulls last, d.id desc`,
    );
  }

  /** 오탐 해제. 다시 노출되고, 이후 동기화에서 재병합하지 않는다. */
  @Post('duplicates/:id/unlink')
  async unlinkDuplicate(@Param('id', ParseIntPipe) id: number) {
    await this.db.query(`update notices set duplicate_of = null, merge_ignored = true where id = $1`, [id]);
    return { ok: true };
  }

  @Get('extractions')
  extractions(@Query() query: Record<string, string>) {
    const f = parse(pageSchema.extend({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FAILED']).optional() }), query);
    return this.extraction.list({ status: f.status ?? null, limit: f.limit, offset: f.offset });
  }

  /** 검수 화면에서 고친 표를 그대로 받아 반영한 뒤, 새 단지 좌표를 바로 찍는다. */
  @Post('extractions/:noticeId/approve')
  async approve(@Param('noticeId', ParseIntPipe) noticeId: number, @Body() body: unknown) {
    const { houses, eligibility } = parse(z.object({ houses: z.array(extractedHouseSchema), eligibility: z.array(extractedEligibilitySchema) }), body);
    await this.extraction.approve(noticeId, houses, eligibility);
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
