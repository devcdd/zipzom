import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser, type SessionUser } from '../auth/auth.js';
import { parse } from '../validate.js';
import { Db } from '../db.js';
import { NoticesService } from '../notices/notices.service.js';
import { profileSchema } from '../profiles/profiles.service.js';
import { applyOverride, evaluate, type Rule } from './matcher.js';

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
    // 공통 규칙에서 떨어져도 공고별 기준(자격완화 등)으로 붙을 수 있으니 규칙이 있는 공급유형은 모두 후보로 가져온다
    const supplyTypes = [...new Set(rules.map((r) => r.supplyType))];

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

    // 공고별 자격 기준이 있으면 그걸로 판정, 없으면 그 공급유형의 공통 규칙 통과 여부. 공통 규칙에 없는 계층(INDUSTRIAL·OTHER)은 판정 불가라 제외
    const perNotice = items.map((n) => {
      if (n.eligibility.length === 0) {
        const codes = rules.filter((r) => r.supplyType === n.supplyType && matchedRules.includes(r.code)).map((r) => r.code);
        return { notice: n, codes, overridden: false };
      }
      const codes = rules
        .filter((r) => n.eligibility.some((e) => e.code === r.code))
        .filter((r) => evaluate(profile, applyOverride(r, n.eligibility.find((e) => e.code === r.code)), base?.amount ?? 0).ok)
        .map((r) => r.code);
      return { notice: n, codes, overridden: true };
    });
    const passed = perNotice.filter((p) => p.codes.length > 0);

    const matchedAt = new Map<number, string>();
    if (passed.length && user) {
      const rows = await this.db.query<{ notice_id: number; matched_at: Date }>(
        `insert into user_notice_matches (user_id, notice_id, matched_rules)
         select $1, unnest($2::bigint[]), $3::text[]
         on conflict (user_id, notice_id) do update set matched_rules = excluded.matched_rules
         returning notice_id, matched_at`,
        [user.id, passed.map((p) => p.notice.id), matchedRules],
      );
      for (const r of rows) matchedAt.set(r.notice_id, r.matched_at.toISOString());
    }
    return {
      eligible: matchedRules.length > 0 || passed.length > 0,
      evaluations,
      notices: passed.map((p) => ({ ...p.notice, matchedAt: matchedAt.get(p.notice.id), matchedCodes: p.codes, noticeSpecific: p.overridden })),
    };
  }
}
