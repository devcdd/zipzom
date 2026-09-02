import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser, type SessionUser } from '../auth/auth.js';
import { parse } from '../validate.js';
import { Db } from '../db.js';
import { NoticesService } from '../notices/notices.service.js';
import { profileSchema } from '../profiles/profiles.service.js';
import { evaluate, type Rule } from './matcher.js';

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly db: Db,
    private readonly notices: NoticesService,
  ) {}

  /**
   * 계층 자격은 공고와 무관하게 프로필로 결정되고, 공고는 유형·모집 중·관심 지역으로 거른다.
   * 프로필은 본문으로 받는다 — 비로그인은 localStorage 프로필로도 판정 가능. NEW 배지용 매칭 이력은 로그인 시에만 기록
   */
  @Post()
  async evaluate(@Body() body: unknown, @CurrentUser() user: SessionUser | null) {
    const profile = parse(profileSchema, body);
    const rules = await this.db.query<Rule>(
      `select code, supply_type as "supplyType", label, min_age as "minAge", max_age as "maxAge", requires_unmarried as "requiresUnmarried",
         marriage_within_years as "marriageWithinYears", child_max_age as "childMaxAge", income_pct as "incomePct",
         dual_income_pct as "dualIncomePct", bonus_pct_1p as "bonusPct1p", bonus_pct_2p as "bonusPct2p",
         asset_limit as "assetLimit", car_limit as "carLimit", max_residence_years as "maxResidenceYears"
       from eligibility_rules where effective_from <= current_date order by code`,
    );
    const base = await this.db.one<{ amount: number }>(
      `select amount from income_standards
       where household_size = $1 and apply_year = (select max(apply_year) from income_standards where apply_year <= $2)`,
      [Math.min(profile.householdSize, 6), new Date().getFullYear()],
    );
    const evaluations = rules.map((r) => evaluate(profile, r, base?.amount ?? 0));
    const matchedRules = evaluations.filter((e) => e.ok).map((e) => e.code);
    if (matchedRules.length === 0) return { eligible: false, evaluations, notices: [] };
    // 규칙마다 열어주는 공급유형이 다르다. 행복주택 6계층에 다 걸려도 든든전세는 무주택이면 따로 열린다
    const supplyTypes = [...new Set(rules.filter((r) => matchedRules.includes(r.code)).map((r) => r.supplyType))];

    // 'XX000'은 시도 전체 선택. 관심 지역이 없으면 거주 시도
    const sigungu = profile.preferredSigunguCodes.filter((c) => !c.endsWith('000'));
    const sido = profile.preferredSigunguCodes.filter((c) => c.endsWith('000')).map((c) => c.slice(0, 2));
    const scoped = sigungu.length + sido.length > 0;
    const { items } = await this.notices.list({
      supplyTypes,
      phases: ['open', 'upcoming'],
      sigunguCodes: scoped ? sigungu : null,
      sidoCodes: scoped ? sido : [profile.sidoCode],
      limit: 200,
      offset: 0,
    });

    const matchedAt = new Map<number, string>();
    if (items.length && user) {
      const rows = await this.db.query<{ notice_id: number; matched_at: Date }>(
        `insert into user_notice_matches (user_id, notice_id, matched_rules)
         select $1, unnest($2::bigint[]), $3::text[]
         on conflict (user_id, notice_id) do update set matched_rules = excluded.matched_rules
         returning notice_id, matched_at`,
        [user.id, items.map((n) => n.id), matchedRules],
      );
      for (const r of rows) matchedAt.set(r.notice_id, r.matched_at.toISOString());
    }
    return { eligible: true, evaluations, notices: items.map((n) => ({ ...n, matchedAt: matchedAt.get(n.id) })) };
  }
}
