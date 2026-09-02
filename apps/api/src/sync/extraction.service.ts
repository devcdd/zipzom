import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Db } from '../db.js';
import { extractFromPdf, type ExtractedEligibility, type ExtractedHouse } from './house-extractor.js';
import { fetchLhFiles, parseLhParams, pickLhNoticePdf, type LhPanKey } from './lh.client.js';

// 행복주택 계열 공급정보 유형 코드. 상세 API는 이 중 하나면 응답한다
const LH_SPL_CANDIDATES = ['063', '060', '061', '062'];
import { fetchShAttachments, pickShNoticePdf } from './sh-rss.client.js';

export interface Extraction {
  noticeId: number;
  source: 'MYHOME' | 'LH' | 'SH' | 'HUG';
  title: string;
  detailUrl: string | null;
  pdfUrl: string;
  pdfName: string | null;
  model: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';
  houses: ExtractedHouse[] | null;
  eligibility: ExtractedEligibility[] | null;
  error: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

interface PdfRef {
  url: string;
  name: string;
}

@Injectable()
export class ExtractionService {
  private readonly log = new Logger(ExtractionService.name);

  constructor(private readonly db: Db) {}

  get enabled() {
    return !!process.env.OPENAI_API_KEY;
  }

  /** 아직 추출 행이 없는 공고만. 실패해도 FAILED 행을 남겨 매일 재시도하지 않는다 (어드민에서 수동 재시도). */
  async extractIfMissing(noticeId: number) {
    const exists = await this.db.one(`select 1 from notice_extractions where notice_id = $1`, [noticeId]);
    if (exists) return;
    await this.extract(noticeId);
  }

  /** 공고 소스별로 공고문 PDF를 찾아 LLM 추출. SH는 단지 표까지, LH(마이홈)는 단지 정보가 이미 있어 자격·배정만 */
  async extract(noticeId: number) {
    const n = await this.db.one<{ source: string; detail_url: string | null; raw: Record<string, string | undefined> }>(
      `select source, detail_url, raw from notices where id = $1`,
      [noticeId],
    );
    if (!n) throw new NotFoundException(`notice ${noticeId} not found`);
    let pdf: PdfRef | undefined;
    try {
      pdf = n.source === 'SH' ? await this.shPdf(n.detail_url) : await this.lhPdf(n.raw ?? {});
      if (!pdf) throw new Error('공고문 PDF 첨부 없음');
      const res = await fetch(pdf.url, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`pdf HTTP ${res.status}`);
      const { houses, eligibility, usage } = await extractFromPdf(new Uint8Array(await res.arrayBuffer()), pdf.name, { withHouseDetail: n.source === 'SH' });
      await this.db.query(
        `insert into notice_extractions (notice_id, pdf_url, pdf_name, model, status, houses, eligibility, usage, error, created_at, reviewed_at)
         values ($1, $2, $3, $4, 'PENDING', $5, $6, $7, null, now(), null)
         on conflict (notice_id) do update set pdf_url = excluded.pdf_url, pdf_name = excluded.pdf_name, model = excluded.model,
           status = 'PENDING', houses = excluded.houses, eligibility = excluded.eligibility, usage = excluded.usage, error = null, created_at = now(), reviewed_at = null`,
        [noticeId, pdf.url, pdf.name, process.env.OPENAI_MODEL || 'gpt-5.6-luna', JSON.stringify(houses), JSON.stringify(eligibility), JSON.stringify(usage)],
      );
      this.log.log(`extracted notice ${noticeId}: ${houses.length} houses, ${eligibility.length} groups`);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      this.log.warn(`extraction failed for notice ${noticeId}: ${error}`);
      await this.db.query(
        `insert into notice_extractions (notice_id, pdf_url, pdf_name, status, error)
         values ($1, $2, $3, 'FAILED', $4)
         on conflict (notice_id) do update set status = 'FAILED', error = excluded.error, created_at = now()`,
        [noticeId, pdf?.url ?? n.detail_url ?? '', pdf?.name ?? null, error],
      );
    }
  }

  private async shPdf(viewUrl: string | null): Promise<PdfRef | undefined> {
    if (!viewUrl) return undefined;
    const f = pickShNoticePdf(await fetchShAttachments(viewUrl));
    return f && { url: f.url, name: f.name };
  }


  /**
   * 상세 API의 SPL_INF_TP_CD는 실제로 정확히 맞을 필요가 없다(060~063 아무거나 응답, 064만 빈 응답 — 2026-09 실측).
   * 목록 API는 현재 게시 중인 공고만 주므로 마감 공고는 색인에 없다. raw에 코드가 있으면 먼저 쓰고, 없으면 후보를 순서대로 시도
   */
  private async lhPdf(raw: { url?: string; DTL_URL?: string; SPL_INF_TP_CD?: string; PAN_ID?: string; CCR_CNNT_SYS_DS_CD?: string; UPP_AIS_TP_CD?: string; AIS_TP_CD?: string }): Promise<PdfRef | undefined> {
    const k: LhPanKey | null =
      raw.PAN_ID
        ? { panId: raw.PAN_ID, ccrCnntSysDsCd: raw.CCR_CNNT_SYS_DS_CD ?? '03', uppAisTpCd: raw.UPP_AIS_TP_CD ?? '06', aisTpCd: raw.AIS_TP_CD ?? '10' }
        : parseLhParams(raw.url ?? raw.DTL_URL);
    if (!k) throw new Error('LH 청약플러스 링크 아님');
    for (const spl of new Set([raw.SPL_INF_TP_CD, ...LH_SPL_CANDIDATES].filter(Boolean) as string[])) {
      const files = await fetchLhFiles(k, spl);
      if (files.length === 0) continue;
      const f = pickLhNoticePdf(files);
      return f && { url: f.url, name: f.name };
    }
    return undefined;
  }

  list(): Promise<Extraction[]> {
    return this.db.query<Extraction>(
      `select e.notice_id as "noticeId", n.source, n.title, n.detail_url as "detailUrl", e.pdf_url as "pdfUrl", e.pdf_name as "pdfName",
         e.model, e.status, e.houses, e.eligibility, e.error, e.created_at as "createdAt", e.reviewed_at as "reviewedAt"
       from notice_extractions e join notices n on n.id = e.notice_id
       order by case e.status when 'PENDING' then 0 when 'FAILED' then 1 else 2 end, e.created_at desc`,
    );
  }

  /**
   * 검수된 값 반영. 자격 기준은 notice_eligibility로 교체.
   * 단지: SH는 notice_houses를 통째로 교체(플레이스홀더 제거), 그 외는 마이홈 단지가 이미 있으니 이름으로 맞춰 eligible_groups만 채운다.
   */
  async approve(noticeId: number, houses: ExtractedHouse[], eligibility: ExtractedEligibility[]) {
    const n = await this.db.one<{ source: string }>(
      `select n.source from notice_extractions e join notices n on n.id = e.notice_id where e.notice_id = $1`,
      [noticeId],
    );
    if (!n) throw new NotFoundException(`extraction for notice ${noticeId} not found`);
    const groupsOf = (h: ExtractedHouse) => h.groups.filter((g) => (g.supplyCount ?? 1) > 0).map((g) => g.code);
    await this.db.tx(async (q) => {
      if (n.source === 'SH') {
        await q(`delete from notice_houses where notice_id = $1`, [noticeId]);
        for (const [i, h] of houses.entries()) {
          await q(
            `insert into notice_houses (notice_id, house_sn, name, address, sido_code, total_households, supply_count, min_deposit, min_monthly_rent, eligible_groups, area_min, area_max)
             values ($1, $2, $3, $4, '11', $5, $6, $7, $8, $9, $10, $11)`,
            [noticeId, String(i + 1), h.name, h.address, h.totalHouseholds, h.supplyCount, h.minDeposit, h.minMonthlyRent, groupsOf(h), h.areaMin, h.areaMax],
          );
        }
      } else {
        // ponytail: 단지명 부분일치. 공고문 표기와 마이홈 단지명이 다르면 못 맞추고 null로 남는다 (검수 화면에서 확인)
        for (const h of houses) {
          await q(
            `update notice_houses set eligible_groups = $3 where notice_id = $1
               and (name ilike '%' || $2 || '%' or $2 ilike '%' || name || '%')`,
            [noticeId, h.name.replace(/\s+/g, ''), groupsOf(h)],
          );
        }
      }
      await q(`delete from notice_eligibility where notice_id = $1`, [noticeId]);
      for (const e of eligibility) {
        await q(
          `insert into notice_eligibility (notice_id, code, label, age_min, age_max, income_pct, dual_income_pct, asset_limit, car_limit, exempt, conditions)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           on conflict (notice_id, code) do update set label = excluded.label, age_min = excluded.age_min, age_max = excluded.age_max,
             income_pct = excluded.income_pct, dual_income_pct = excluded.dual_income_pct, asset_limit = excluded.asset_limit,
             car_limit = excluded.car_limit, exempt = excluded.exempt, conditions = excluded.conditions`,
          [noticeId, e.code, e.label, e.ageMin, e.ageMax, e.incomePct, e.dualIncomePct, e.assetLimit, e.carLimit, e.exempt, e.conditions],
        );
      }
      await q(`update notice_extractions set status = 'APPROVED', houses = $2, eligibility = $3, reviewed_at = now() where notice_id = $1`, [
        noticeId,
        JSON.stringify(houses),
        JSON.stringify(eligibility),
      ]);
    });
  }

  async reject(noticeId: number) {
    await this.db.query(`update notice_extractions set status = 'REJECTED', reviewed_at = now() where notice_id = $1`, [noticeId]);
  }

  retry(noticeId: number) {
    return this.extract(noticeId);
  }

  /** 진행·예정 중인 LH 행복주택 공고(마이홈·LH 직접수집, 대표만) 중 추출 행이 없는 것. 한 번에 limit개 (건당 1분 안팎이라 동기화가 길어지지 않게) */
  async pendingLhNoticeIds(limit: number): Promise<number[]> {
    const rows = await this.db.query<{ id: number }>(
      `select n.id from notices n
       where n.institution = 'LH' and n.supply_type = '행복주택' and n.duplicate_of is null
         and coalesce(n.apply_end_on, n.posted_on + 45) >= current_date
         and not exists (select 1 from notice_extractions e where e.notice_id = n.id)
       order by n.posted_on desc limit $1`,
      [limit],
    );
    return rows.map((r) => r.id);
  }
}
