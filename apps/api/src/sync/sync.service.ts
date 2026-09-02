import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Db } from '../db.js';
import { SIDO_NAMES } from '../notices/sido.js';
import { ExtractionService } from './extraction.service.js';
import { planMerges, type DedupeRow } from './dedupe.js';
import { geocode } from './geocoder.js';
import { fetchHugJeonseRows, groupHugNotices, hugEnabled } from './hug.client.js';
import { fetchLhComplexes, fetchLhDetail, fetchLhNotices, lhDate, lhEnabled, parseArea, parseLhParams, type LhNotice } from './lh.client.js';
import { fetchMyhomeNotices, type MyhomeItem } from './myhome.client.js';
import { fetchShHappyHouseNotices, parseShNotice } from './sh-rss.client.js';

const DAY = 86_400_000;
// HUG는 공고별 상세 URL을 API로 주지 않아 목록 페이지로 보낸다
// 화면에 노출하는 공급유형만 LH에서 가져온다 (국민임대·영구임대 등은 수집 대상 밖)
const SUPPLY_TYPES = ['행복주택'];
const HUG_LIST_URL = 'https://www.khug.or.kr/jeonse/web/s09/s090101.jsp';
const ymd = (s: string) => (/^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}` : null);
const num = (v: number | string | null | undefined) => (v === '' || v == null ? null : Number(v));
const yyyymm = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;

export interface SyncReport {
  myhome: { fetched: number; notices: number; error?: string };
  sh: { fetched: number; notices: number; error?: string };
  lhArea: { updated: number; error?: string };
  lhExtract: { attempted: number; error?: string };
  hug: { fetched: number; notices: number; error?: string };
  lh: { fetched: number; notices: number; error?: string };
  merge: { linked: number };
  geocode: { attempted: number; resolved: number; error?: string };
}

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly log = new Logger(SyncService.name);
  private running: Promise<SyncReport> | null = null;

  constructor(
    private readonly db: Db,
    private readonly extraction: ExtractionService,
  ) {}

  async onModuleInit() {
    // ponytail: setInterval 일 1회. 실행 시각 고정이 필요해지면 @nestjs/schedule
    setInterval(() => void this.runAll(), DAY).unref();
    try {
      const last = await this.db.one<{ finished_at: Date | null }>(
        `select finished_at from sync_runs where error is null order by started_at desc limit 1`,
      );
      if (!last?.finished_at || Date.now() - last.finished_at.getTime() > DAY / 2) void this.runAll();
    } catch (e) {
      // DB가 아직 안 떠 있어도 서버는 기동한다. 요청 시점에 풀이 재연결하고, 다음 인터벌에 동기화
      this.log.error(`initial sync skipped (db unreachable): ${e instanceof Error ? e.message : e}`);
    }
  }

  get isRunning() {
    return this.running !== null;
  }

  /** 어드민 수동 트리거와 스케줄이 겹치면 진행 중인 실행을 공유한다. */
  runAll(): Promise<SyncReport> {
    this.running ??= this.doRunAll().finally(() => (this.running = null));
    return this.running;
  }

  private async doRunAll(): Promise<SyncReport> {
    const report: SyncReport = {
      myhome: await this.tracked('MYHOME', () => this.syncMyhome()),
      sh: await this.tracked('SH', () => this.syncSh()),
      lhArea: await this.enrichLhAreas(),
      lhExtract: await this.extractLh(),
      hug: await this.tracked('HUG', () => this.syncHug()),
      lh: await this.tracked('LH', () => this.syncLh()),
      merge: await this.linkDuplicates(),
      geocode: await this.geocodeMissing(),
    };
    this.log.log(`sync done ${JSON.stringify(report)}`);
    return report;
  }

  private async tracked(source: 'MYHOME' | 'SH' | 'HUG' | 'LH', fn: () => Promise<{ fetched: number; notices: number }>) {
    const run = (await this.db.one<{ id: number }>(`insert into sync_runs (source) values ($1) returning id`, [source]))!;
    try {
      const r = await fn();
      await this.db.query(`update sync_runs set finished_at = now(), fetched = $2, upserted = $3 where id = $1`, [run.id, r.fetched, r.notices]);
      return r;
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      this.log.error(`${source} sync failed: ${error}`);
      await this.db.query(`update sync_runs set finished_at = now(), error = $2 where id = $1`, [run.id, error]);
      return { fetched: 0, notices: 0, error };
    }
  }

  /** 최근 4개월 공고월 윈도우 전량. 마이홈은 (공고 × 단지) 행으로 내려주므로 공고 단위로 묶어 upsert. */
  async syncMyhome() {
    const end = new Date();
    const begin = new Date(end.getFullYear(), end.getMonth() - 4, 1);
    const items = await fetchMyhomeNotices(yyyymm(begin), yyyymm(end));
    const byNotice = new Map<string, MyhomeItem[]>();
    for (const it of items) byNotice.set(it.pblancId, [...(byNotice.get(it.pblancId) ?? []), it]);

    for (const [pblancId, rows] of byNotice) {
      const h = rows[0];
      const notice = (await this.db.one<{ id: number }>(
        `insert into notices (source, source_id, title, institution, house_type, supply_type, status,
           posted_on, apply_begin_on, apply_end_on, winner_announce_on, detail_url, contact, raw)
         values ('MYHOME', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         on conflict (source, source_id) do update set
           title = excluded.title, institution = excluded.institution, house_type = excluded.house_type,
           supply_type = excluded.supply_type, status = excluded.status, posted_on = excluded.posted_on,
           apply_begin_on = excluded.apply_begin_on, apply_end_on = excluded.apply_end_on,
           winner_announce_on = excluded.winner_announce_on, detail_url = excluded.detail_url,
           contact = excluded.contact, raw = excluded.raw, updated_at = now()
         returning id`,
        [
          pblancId, h.pblancNm, h.suplyInsttNm, h.houseTyNm || null, h.suplyTyNm || null, h.sttusNm || null,
          ymd(h.rcritPblancDe), ymd(h.beginDe), ymd(h.endDe), ymd(h.przwnerPresnatnDe),
          h.url || h.pcUrl || null, h.refrnc || null, JSON.stringify(h),
        ],
      ))!;
      for (const r of rows) {
        const pnu = r.pnu || null;
        await this.db.query(
          `insert into notice_houses (notice_id, house_sn, name, address, pnu, sido_code, sigungu_code,
             total_households, supply_count, min_deposit, min_monthly_rent)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           on conflict (notice_id, house_sn) do update set
             name = excluded.name, address = excluded.address, pnu = excluded.pnu,
             sido_code = excluded.sido_code, sigungu_code = excluded.sigungu_code,
             total_households = excluded.total_households, supply_count = excluded.supply_count,
             min_deposit = excluded.min_deposit, min_monthly_rent = excluded.min_monthly_rent`,
          [
            notice.id, String(r.houseSn), r.hsmpNm || null, r.fullAdres.trim() || null, pnu,
            pnu?.slice(0, 2) ?? null, pnu?.slice(0, 5) ?? null,
            num(r.totHshldCo), num(r.sumSuplyCo), num(r.rentGtn), num(r.mtRntchrg),
          ],
        );
        if (pnu) {
          await this.db.query(
            `insert into regions (code, sido_code, name) values ($1, $2, $3)
             on conflict (code) do update set name = excluded.name`,
            [pnu.slice(0, 5), pnu.slice(0, 2), `${r.brtcNm} ${r.signguNm}`.trim()],
          );
        }
      }
    }
    return { fetched: items.length, notices: byNotice.size };
  }

  /** SH는 마이홈 API에 집계되지 않아(2026-09 확인) RSS가 유일한 소스. 단지·주소 없음 → 서울 전체 1행. */
  async syncSh() {
    const items = await fetchShHappyHouseNotices();
    await this.db.query(`insert into regions (code, sido_code, name) values ('11000', '11', '서울특별시') on conflict do nothing`);
    for (const it of items) {
      // 본문에서 접수기간·발표일·공급호수 추출 (단지 목록은 첨부 PDF에만 있어 불가)
      const detail = parseShNotice(it.html);
      const notice = (await this.db.one<{ id: number }>(
        `insert into notices (source, source_id, title, institution, supply_type, status, posted_on,
           apply_begin_on, apply_end_on, winner_announce_on, detail_url, raw)
         values ('SH', $1, $2, 'SH', '행복주택', '공고', $3, $4, $5, $6, $7, $8)
         on conflict (source, source_id) do update set title = excluded.title,
           apply_begin_on = excluded.apply_begin_on, apply_end_on = excluded.apply_end_on,
           winner_announce_on = excluded.winner_announce_on, raw = excluded.raw, updated_at = now()
         returning id`,
        [it.seq, it.title, it.publishedAt, detail.applyBeginOn, detail.applyEndOn, detail.winnerAnnounceOn, it.link, JSON.stringify(it)],
      ))!;
      // 단지 목록 없는 동안만 '서울 전체' 플레이스홀더 1행. 추출 승인으로 실제 단지가 들어오면 다시 넣지 않는다
      await this.db.query(
        `insert into notice_houses (notice_id, house_sn, sido_code, supply_count)
         select $1::bigint, '0', '11', $2::int
         where not exists (select 1 from notice_houses where notice_id = $1::bigint and house_sn <> '0')
         on conflict (notice_id, house_sn) do update set supply_count = excluded.supply_count`,
        [notice.id, detail.supplyCount],
      );
      // 단지 표는 첨부 PDF에만 있어 LLM 추출 → 어드민 검수 후 반영. 키 없으면 건너뜀
      if (this.extraction.enabled) await this.extraction.extractIfMissing(notice.id);
    }
    return { fetched: items.length, notices: items.length };
  }

  /**
   * HUG 든든전세. 모집기간에만 데이터가 있고 끝나면 API에서 사라지므로 지난 공고는 DB에 남은 것으로 유지한다.
   * 응답이 (공고 × 주택) 평면 행이고 주소·단지명이 없어 시군구 단위로 묶어 1행씩 넣는다.
   */
  async syncHug() {
    if (!hugEnabled()) return { fetched: 0, notices: 0 };
    const rows = await fetchHugJeonseRows();
    const notices = groupHugNotices(rows);
    for (const n of notices) {
      const notice = (await this.db.one<{ id: number }>(
        `insert into notices (source, source_id, title, institution, supply_type, status, posted_on,
           apply_begin_on, apply_end_on, winner_announce_on, detail_url, raw)
         values ('HUG', $1, $2, 'HUG', '든든전세', '공고', $3, $4, $5, $6, $7, $8)
         on conflict (source, source_id) do update set title = excluded.title,
           apply_begin_on = excluded.apply_begin_on, apply_end_on = excluded.apply_end_on,
           winner_announce_on = excluded.winner_announce_on, raw = excluded.raw, updated_at = now()
         returning id`,
        [n.postedOn, n.title, n.postedOn, n.applyBeginOn, n.applyEndOn, n.winnerAnnounceOn, HUG_LIST_URL, JSON.stringify(n.raw)],
      ))!;
      for (const a of n.areas) {
        // 주소가 '서울 강남구' 수준뿐이라 좌표·시군구코드는 기존 지오코딩 단계가 채운다
        await this.db.query(
          `insert into notice_houses (notice_id, house_sn, name, address, supply_count, min_deposit, area_min, area_max)
           values ($1, $2, $3, $3, $4, $5, $6, $7)
           on conflict (notice_id, house_sn) do update set
             name = excluded.name, address = excluded.address,
             supply_count = excluded.supply_count, min_deposit = excluded.min_deposit,
             area_min = excluded.area_min, area_max = excluded.area_max`,
          [notice.id, a.key, a.address, a.supplyCount, a.minDeposit, a.areaMin, a.areaMax],
        );
      }
    }
    return { fetched: rows.length, notices: notices.length };
  }

  /**
   * LH 청약플러스. 마이홈이 LH를 전부 커버하지 않아 별도 수집한다.
   * 목록 API에는 단지·주소가 없어 상세 API를 한 번 더 부른다. 호출 수를 아끼려고
   * 대표 공고로 남을 것(duplicate_of가 없는 것) 중 단지가 아직 없는 건만 상세를 받는다.
   */
  async syncLh() {
    if (!lhEnabled()) return { fetched: 0, notices: 0 };
    const all = await fetchLhNotices();
    this.lhSpl = new Map(all.map((n) => [n.PAN_ID, n.SPL_INF_TP_CD]));
    const items = all.filter((n) => SUPPLY_TYPES.includes(n.AIS_TP_CD_NM));

    for (const n of items) {
      await this.db.query(
        `insert into notices (source, source_id, title, institution, supply_type, status, posted_on,
           apply_end_on, detail_url, raw)
         values ('LH', $1, $2, 'LH', $3, $4, $5, $6, $7, $8)
         on conflict (source, source_id) do update set
           title = excluded.title, supply_type = excluded.supply_type, status = excluded.status,
           posted_on = excluded.posted_on, apply_end_on = excluded.apply_end_on,
           detail_url = excluded.detail_url, raw = excluded.raw, updated_at = now()`,
        [n.PAN_ID, n.PAN_NM, n.AIS_TP_CD_NM, n.PAN_SS, lhDate(n.PAN_NT_ST_DT), lhDate(n.CLSG_DT), n.DTL_URL, JSON.stringify(n)],
      );
    }

    await this.linkDuplicates();

    const pending = await this.db.query<{ id: number; source_id: string }>(
      `select n.id, n.source_id from notices n
       where n.source = 'LH' and n.duplicate_of is null
         and not exists (select 1 from notice_houses h where h.notice_id = n.id)`,
    );
    const byId = new Map(items.map((n) => [n.PAN_ID, n]));
    for (const row of pending) {
      const n = byId.get(row.source_id);
      if (!n) continue;
      await this.fillLhDetail(row.id, n);
    }
    return { fetched: all.length, notices: items.length };
  }

  /** 상세 응답의 단지·일정을 공고에 채운다. 한 건 실패가 전체를 멈추지 않게 개별 처리. */
  private async fillLhDetail(noticeId: number, n: LhNotice) {
    try {
      const detail = await fetchLhDetail(n);
      if (detail.schedule) {
        await this.db.query(
          `update notices set apply_begin_on = coalesce($2, apply_begin_on),
             apply_end_on = coalesce($3, apply_end_on), winner_announce_on = coalesce($4, winner_announce_on)
           where id = $1`,
          [noticeId, lhDate(detail.schedule.SBSC_ACP_ST_DT), lhDate(detail.schedule.SBSC_ACP_CLSG_DT), lhDate(detail.schedule.PZWR_ANC_DT)],
        );
      }
      for (const [i, c] of detail.complexes.entries()) {
        const address = [c.LGDN_ADR, c.LGDN_DTL_ADR].map((v) => v?.trim()).filter(Boolean).join(' ') || null;
        await this.db.query(
          `insert into notice_houses (notice_id, house_sn, name, address, total_households, area_min, area_max)
           values ($1, $2, $3, $4, $5, $6, $7)
           on conflict (notice_id, house_sn) do update set
             name = excluded.name, address = excluded.address, total_households = excluded.total_households,
             area_min = coalesce(excluded.area_min, notice_houses.area_min), area_max = coalesce(excluded.area_max, notice_houses.area_max)`,
          [noticeId, String(i), c.LCC_NT_NM?.trim() || null, address, Number(c.HSH_CNT) || null, parseArea(c.DDO_AR)?.min ?? null, parseArea(c.DDO_AR)?.max ?? null],
        );
      }
    } catch (e) {
      this.log.warn(`lh detail ${n.PAN_ID} failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** 제목이 같은 공고를 묶어 대표 1건만 남긴다. 어드민이 끈 건(merge_ignored)은 건드리지 않는다. */
  async linkDuplicates() {
    const rows = await this.db.query<DedupeRow>(
      `select n.id, n.source, n.title, n.posted_on::text as "postedOn",
         (select count(*)::int from notice_houses h where h.notice_id = n.id) as "houseCount"
       from notices n
       where not n.merge_ignored
         -- 정정공고에 밀려 이미 목록에서 빠진 공고. 대표로 뽑히면 정정공고까지 같이 숨어 공고가 통째로 사라진다
         and not exists (select 1 from notices n2 where n2.source = n.source and n2.raw->>'beforePblancId' = n.source_id)`,
    );
    const links = planMerges(rows);
    const linked = new Set(links.map((l) => l.duplicateId));
    await this.db.query(
      `update notices set duplicate_of = null
       where duplicate_of is not null and not merge_ignored and id <> all($1::bigint[])`,
      [[...linked]],
    );
    for (const l of links) {
      await this.db.query(`update notices set duplicate_of = $2 where id = $1 and not merge_ignored`, [l.duplicateId, l.canonicalId]);
    }
    return { linked: links.length };
  }

  private lhSpl = new Map<string, string>();

  /**
   * 마이홈 API엔 면적이 없다. LH 링크가 있는 공고는 상세 API dsSbd.DDO_AR로 단지 면적을 채운다.
   * 단지명 부분일치. 색인(lhSpl)은 같은 실행의 syncLh가 만든 것을 쓴다
   */
  async enrichLhAreas(limit = 30) {
    if (!lhEnabled()) return { updated: 0 };
    let updated = 0;
    try {
      const targets = await this.db.query<{ id: number; url: string | null }>(
        `select n.id, coalesce(n.raw->>'url', n.raw->>'DTL_URL') as url from notices n
         where n.institution = 'LH' and n.duplicate_of is null
           and exists (select 1 from notice_houses h where h.notice_id = n.id and h.area_min is null)
         order by n.posted_on desc limit $1`,
        [limit],
      );
      for (const t of targets) {
        const k = parseLhParams(t.url);
        if (!k) continue;
        // 색인에 없어도(마감 공고) 상세는 후보 코드 아무거나로 열린다
        let complexes: Awaited<ReturnType<typeof fetchLhComplexes>> = [];
        for (const spl of new Set([this.lhSpl.get(k.panId), '063', '060', '061', '062'].filter(Boolean) as string[])) {
          complexes = await fetchLhComplexes(k, spl);
          if (complexes.length) break;
        }
        for (const c of complexes) {
          const a = parseArea(c.DDO_AR);
          const name = c.LCC_NT_NM?.replace(/\s+/g, '');
          if (!a || !name) continue;
          const r = await this.db.query(
            `update notice_houses set area_min = $3, area_max = $4 where notice_id = $1 and area_min is null
               and (replace(name, ' ', '') ilike '%' || $2 || '%' or $2 ilike '%' || replace(name, ' ', '') || '%') returning id`,
            [t.id, name, a.min, a.max],
          );
          updated += r.length;
        }
      }
      return { updated };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      this.log.warn(`lh area enrich stopped: ${error}`);
      return { updated, error };
    }
  }

  /** LH 행복주택 공고문 자격 추출. 마이홈 단지 정보는 그대로 두고 자격·배정 계층만 뽑는다. 백그라운드라 회당 30건 */
  async extractLh(limit = 30) {
    if (!this.extraction.enabled) return { attempted: 0 };
    try {
      const ids = await this.extraction.pendingLhNoticeIds(limit);
      for (const id of ids) await this.extraction.extract(id);
      return { attempted: ids.length };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      this.log.warn(`lh extraction stopped: ${error}`);
      return { attempted: 0, error };
    }
  }

  /** 좌표 없는 단지만 지오코딩. 카카오 인증 오류(카카오맵 미활성화 등)는 첫 실패에서 중단. */
  async geocodeMissing(limit = 200) {
    const targets = await this.db.query<{ id: number; address: string | null; name: string | null }>(
      `select id, address, name from notice_houses
       where lat is null and geocode_failed_at is null and (address is not null or name is not null)
       order by id desc limit $1`,
      [limit],
    );
    let resolved = 0;
    for (const t of targets) {
      try {
        const p = await geocode(t.address ?? '', t.name ?? undefined);
        if (p) {
          resolved++;
          // SH 단지는 pnu가 없어 법정동코드로 시군구를 채워야 지역 필터에 잡힌다
          const sigungu = p.bcode?.slice(0, 5) ?? null;
          await this.db.query(`update notice_houses set lat = $2, lng = $3, sigungu_code = coalesce(sigungu_code, $4) where id = $1`, [t.id, p.lat, p.lng, sigungu]);
          if (sigungu && p.sigunguName) {
            // 시도 행이 없으면 "XX000" 행부터 만들고, 시군구 이름은 항상 "시도명 구명" 형태로 (마이홈 표기와 동일)
            const sidoCode = sigungu.slice(0, 2);
            const sidoName = SIDO_NAMES[sidoCode] ?? p.regionName ?? sidoCode;
            await this.db.query(
              `insert into regions (code, sido_code, name) values ($1, $2, $3) on conflict (code) do nothing`,
              [`${sidoCode}000`, sidoCode, sidoName],
            );
            await this.db.query(
              `insert into regions (code, sido_code, name) values ($1, $2, $3) on conflict (code) do nothing`,
              [sigungu, sidoCode, `${sidoName} ${p.sigunguName}`],
            );
          }
        } else {
          await this.db.query(`update notice_houses set geocode_failed_at = now() where id = $1`, [t.id]);
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        this.log.warn(`geocode stopped: ${error}`);
        return { attempted: targets.length, resolved, error };
      }
    }
    return { attempted: targets.length, resolved };
  }
}
