import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Db } from '../db.js';
import { extractHousesFromPdf, type ExtractedHouse } from './house-extractor.js';
import { fetchShAttachments, pickShNoticePdf } from './sh-rss.client.js';

export interface Extraction {
  noticeId: number;
  title: string;
  detailUrl: string | null;
  pdfUrl: string;
  pdfName: string | null;
  model: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';
  houses: ExtractedHouse[] | null;
  error: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

@Injectable()
export class ExtractionService {
  private readonly log = new Logger(ExtractionService.name);

  constructor(private readonly db: Db) {}

  get enabled() {
    return !!process.env.OPENAI_API_KEY;
  }

  /** 아직 추출 행이 없는 SH 공고만. 실패해도 FAILED 행을 남겨 매일 재시도하지 않는다 (어드민에서 수동 재시도). */
  async extractIfMissing(noticeId: number, viewUrl: string) {
    const exists = await this.db.one(`select 1 from notice_extractions where notice_id = $1`, [noticeId]);
    if (exists) return;
    await this.extract(noticeId, viewUrl);
  }

  async extract(noticeId: number, viewUrl: string) {
    let pdfUrl = viewUrl;
    let pdfName: string | null = null;
    try {
      const pdf = pickShNoticePdf(await fetchShAttachments(viewUrl));
      if (!pdf) throw new Error('공고문 PDF 첨부 없음');
      ({ url: pdfUrl, name: pdfName } = pdf);
      const res = await fetch(pdf.url, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`pdf HTTP ${res.status}`);
      const { houses, usage } = await extractHousesFromPdf(new Uint8Array(await res.arrayBuffer()), pdf.name);
      await this.db.query(
        `insert into notice_extractions (notice_id, pdf_url, pdf_name, model, status, houses, usage, error, created_at, reviewed_at)
         values ($1, $2, $3, $4, 'PENDING', $5, $6, null, now(), null)
         on conflict (notice_id) do update set pdf_url = excluded.pdf_url, pdf_name = excluded.pdf_name, model = excluded.model,
           status = 'PENDING', houses = excluded.houses, usage = excluded.usage, error = null, created_at = now(), reviewed_at = null`,
        [noticeId, pdfUrl, pdfName, process.env.OPENAI_MODEL || 'gpt-5.6-luna', JSON.stringify(houses), JSON.stringify(usage)],
      );
      this.log.log(`extracted notice ${noticeId}: ${houses.length} houses`);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      this.log.warn(`extraction failed for notice ${noticeId}: ${error}`);
      await this.db.query(
        `insert into notice_extractions (notice_id, pdf_url, pdf_name, status, error)
         values ($1, $2, $3, 'FAILED', $4)
         on conflict (notice_id) do update set status = 'FAILED', error = excluded.error, created_at = now()`,
        [noticeId, pdfUrl, pdfName, error],
      );
    }
  }

  list(): Promise<Extraction[]> {
    return this.db.query<Extraction>(
      `select e.notice_id as "noticeId", n.title, n.detail_url as "detailUrl", e.pdf_url as "pdfUrl", e.pdf_name as "pdfName",
         e.model, e.status, e.houses, e.error, e.created_at as "createdAt", e.reviewed_at as "reviewedAt"
       from notice_extractions e join notices n on n.id = e.notice_id
       order by case e.status when 'PENDING' then 0 when 'FAILED' then 1 else 2 end, e.created_at desc`,
    );
  }

  /** 검수된 표로 notice_houses를 통째로 교체. 기존 '서울 전체' 플레이스홀더 행도 이때 사라진다. */
  async approve(noticeId: number, houses: ExtractedHouse[]) {
    const row = await this.db.one<{ notice_id: number }>(`select notice_id from notice_extractions where notice_id = $1`, [noticeId]);
    if (!row) throw new NotFoundException(`extraction for notice ${noticeId} not found`);
    await this.db.tx(async (q) => {
      await q(`delete from notice_houses where notice_id = $1`, [noticeId]);
      for (const [i, h] of houses.entries()) {
        await q(
          `insert into notice_houses (notice_id, house_sn, name, address, sido_code, total_households, supply_count, min_deposit, min_monthly_rent)
           values ($1, $2, $3, $4, '11', $5, $6, $7, $8)`,
          [noticeId, String(i + 1), h.name, h.address, h.totalHouseholds, h.supplyCount, h.minDeposit, h.minMonthlyRent],
        );
      }
      await q(`update notice_extractions set status = 'APPROVED', houses = $2, reviewed_at = now() where notice_id = $1`, [
        noticeId,
        JSON.stringify(houses),
      ]);
    });
  }

  async reject(noticeId: number) {
    await this.db.query(`update notice_extractions set status = 'REJECTED', reviewed_at = now() where notice_id = $1`, [noticeId]);
  }

  async retry(noticeId: number) {
    const n = await this.db.one<{ detail_url: string | null }>(`select detail_url from notices where id = $1 and source = 'SH'`, [noticeId]);
    if (!n?.detail_url) throw new NotFoundException(`SH notice ${noticeId} not found`);
    await this.extract(noticeId, n.detail_url);
  }
}
