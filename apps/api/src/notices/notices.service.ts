import { Injectable } from '@nestjs/common';
import { Db } from '../db.js';

export type Phase = 'upcoming' | 'open' | 'closed';

export interface House {
  id: number;
  houseSn: string | null;
  name: string | null;
  address: string | null;
  sidoCode: string | null;
  sigunguCode: string | null;
  totalHouseholds: number | null;
  supplyCount: number | null;
  minDeposit: number | null;
  minMonthlyRent: number | null;
  lat: number | null;
  lng: number | null;
  eligibleGroups: string[] | null;
  areaMin: number | null; // 전용면적 ㎡
  areaMax: number | null;
}

export interface NoticeEligibility {
  code: string;
  label: string;
  ageMin: number | null;
  ageMax: number | null;
  incomePct: number | null;
  dualIncomePct: number | null;
  assetLimit: number | null;
  carLimit: number | null;
  exempt: string[];
  conditions: string[];
}

export interface Notice {
  id: number;
  source: 'MYHOME' | 'LH' | 'SH' | 'HUG';
  sourceId: string;
  title: string;
  institution: string | null;
  houseType: string | null;
  supplyType: string | null;
  status: string | null;
  postedOn: string | null;
  applyBeginOn: string | null;
  applyEndOn: string | null;
  winnerAnnounceOn: string | null;
  detailUrl: string | null;
  contact: string | null;
  phase: Phase;
  houses: House[];
  eligibility: NoticeEligibility[];
}

export interface ListFilter {
  supplyTypes?: string[] | null;
  phases?: Phase[] | null;
  sigunguCodes?: string[] | null; // 5자리 시군구
  sidoCodes?: string[] | null; // 2자리 시도 (시군구와 OR)
  q?: string | null;
  ids?: number[] | null; // 북마크 목록 등 특정 공고만
  order?: 'recent' | null; // recent = 공고일 최신순. 기본은 모집 중 → 마감 임박순
  limit: number;
  offset: number;
}

@Injectable()
export class NoticesService {
  constructor(private readonly db: Db) {}

  /** 프로필 화면의 관심 공급유형 선택지. 수집된 값이 그대로 목록이 된다 */
  supplyTypes(): Promise<{ supplyType: string; count: number }[]> {
    return this.db.query<{ supplyType: string; count: number }>(
      `select supply_type as "supplyType", count(*)::int as count
       from notices where supply_type is not null and duplicate_of is null
       group by 1 order by 2 desc`,
    );
  }

  async list(f: ListFilter): Promise<{ total: number; items: Notice[] }> {
    const rows = await this.db.query<Notice & { total: number }>(
      `with n as (
         select n.*,
           case
             -- SH RSS처럼 접수기간이 없으면 공고 후 45일을 모집 중으로 본다
             when n.apply_begin_on is null then
               case when coalesce(n.posted_on, n.first_seen_at::date) >= current_date - 45 then 'open' else 'closed' end
             when current_date < n.apply_begin_on then 'upcoming'
             when current_date <= n.apply_end_on then 'open'
             else 'closed'
           end as phase
         from notices n
         -- 정정공고가 가리키는 이전 공고는 숨김
         where not exists (select 1 from notices n2 where n2.source = n.source and n2.raw->>'beforePblancId' = n.source_id)
           -- 마이홈·LH에 같이 올라온 공고는 대표 1건만 (linkDuplicates가 채운다)
           and n.duplicate_of is null
       )
       select n.id, n.source, n.source_id as "sourceId", n.title, n.institution,
         n.house_type as "houseType", n.supply_type as "supplyType", n.status,
         n.posted_on::text as "postedOn", n.apply_begin_on::text as "applyBeginOn",
         n.apply_end_on::text as "applyEndOn", n.winner_announce_on::text as "winnerAnnounceOn",
         n.detail_url as "detailUrl", n.contact, n.phase,
         coalesce(h.houses, '[]'::json) as houses,
         coalesce(el.eligibility, '[]'::json) as eligibility,
         count(*) over() as total
       from n
       left join lateral (
         select json_agg(json_build_object(
           'id', nh.id, 'houseSn', nh.house_sn, 'name', nh.name, 'address', nh.address,
           'sidoCode', nh.sido_code, 'sigunguCode', nh.sigungu_code,
           'totalHouseholds', nh.total_households, 'supplyCount', nh.supply_count,
           'minDeposit', nh.min_deposit, 'minMonthlyRent', nh.min_monthly_rent,
           'lat', nh.lat, 'lng', nh.lng, 'eligibleGroups', nh.eligible_groups,
           'areaMin', nh.area_min, 'areaMax', nh.area_max) order by nh.id) as houses
         from notice_houses nh where nh.notice_id = n.id
       ) h on true
       left join lateral (
         select json_agg(json_build_object(
           'code', ne.code, 'label', ne.label, 'ageMin', ne.age_min, 'ageMax', ne.age_max,
           'incomePct', ne.income_pct, 'dualIncomePct', ne.dual_income_pct, 'assetLimit', ne.asset_limit,
           'carLimit', ne.car_limit, 'exempt', ne.exempt, 'conditions', ne.conditions) order by ne.code) as eligibility
         from notice_eligibility ne where ne.notice_id = n.id
       ) el on true
       -- 유형을 안 주면 모집공고만. SH 게시판에는 당첨자 발표·안내문도 담기고 그건 supply_type이 없다
       where (case when $1::text[] is null then n.supply_type is not null else n.supply_type = any($1) end)
         and ($2::text[] is null or n.phase = any($2))
         and (($3::text[] is null and $4::text[] is null) or exists (
               select 1 from notice_houses nh where nh.notice_id = n.id
                 and (nh.sigungu_code = any(coalesce($3, '{}')) or nh.sido_code = any(coalesce($4, '{}')))))
         and ($5::text is null or n.title ilike '%' || $5 || '%'
              or exists (select 1 from notice_houses nh where nh.notice_id = n.id and nh.name ilike '%' || $5 || '%'))
         and ($8::bigint[] is null or n.id = any($8))
       order by
         -- 접수기간이 없는 공고(SH RSS)는 마감이 언제인지 알 수 없어 접수 예정보다도 뒤로 민다
         case when $9::text = 'recent' then 0 else
           case when n.phase = 'open' and n.apply_end_on is not null then 0
                when n.phase = 'upcoming' then 1
                when n.phase = 'open' then 2
                else 3 end
         end,
         case when $9::text = 'recent' then null else n.apply_end_on end asc nulls last,
         n.posted_on desc nulls last, n.id desc
       limit $6 offset $7`,
      [f.supplyTypes ?? null, f.phases ?? null, f.sigunguCodes ?? null, f.sidoCodes ?? null, f.q?.trim() || null, f.limit, f.offset, f.ids ?? null, f.order ?? null],
    );
    const total = rows[0]?.total ?? 0;
    return { total, items: rows.map(({ total: _t, ...n }) => n) };
  }
}
