import { Injectable } from '@nestjs/common';
import { Db } from '../db.js';
import type { Notice } from '../notices/notices.service.js';
import type { ProfileInput } from '../profiles/profiles.service.js';
import { applyOverride, evaluate, type Evaluation, type Rule } from './matcher.js';

export interface NoticeMatch {
  notice: Notice;
  codes: string[]; // 이 공고에서 통과한 계층
  overridden: boolean; // 공고별 기준(자격완화 등)으로 판정했는지
  unverified: boolean; // 이 공급유형의 공통 규칙이 없어 자격을 못 따진 공고
}

/** 프로필 1개를 공고 목록에 대고 판정한다. 내 매칭 화면과 북마크가 같은 결과를 보도록 여기 한 곳만 쓴다. */
@Injectable()
export class MatchingService {
  constructor(private readonly db: Db) {}

  async rules(): Promise<Rule[]> {
    return this.db.query<Rule>(
      `select code, supply_type as "supplyType", label, min_age as "minAge", max_age as "maxAge", requires_unmarried as "requiresUnmarried",
         marriage_within_years as "marriageWithinYears", child_max_age as "childMaxAge", income_pct as "incomePct",
         dual_income_pct as "dualIncomePct", bonus_pct_1p as "bonusPct1p", bonus_pct_2p as "bonusPct2p",
         asset_limit as "assetLimit", car_limit as "carLimit", max_residence_years as "maxResidenceYears"
       from eligibility_rules where effective_from <= current_date order by code`,
    );
  }

  /** 해당 가구원수의 도시근로자 월평균소득 100% (원). 시드가 없는 해는 가장 가까운 과거 연도 */
  async incomeBase(householdSize: number): Promise<number> {
    const row = await this.db.one<{ amount: number }>(
      `select amount from income_standards
       where household_size = $1 and apply_year = (select max(apply_year) from income_standards where apply_year <= $2)`,
      [Math.min(householdSize, 6), new Date().getFullYear()],
    );
    return row?.amount ?? 0;
  }

  /** 공고별 자격 기준이 있으면 그걸로, 없으면 그 공급유형의 공통 규칙 통과 여부. 공통 규칙에 없는 계층(INDUSTRIAL·OTHER)은 판정 불가라 제외 */
  matchNotices(profile: ProfileInput, rules: Rule[], base: number, evaluations: Evaluation[], notices: Notice[]): NoticeMatch[] {
    const matchedRules = evaluations.filter((e) => e.ok).map((e) => e.code);
    const ruledTypes = new Set(rules.map((r) => r.supplyType));
    return notices.map((n) => {
      if (n.eligibility.length === 0) {
        // 매입임대·장기전세처럼 공통 규칙이 아직 없는 유형. 걸러내면 사용자가 고른 유형이 통째로 사라지므로
        // 판정 없이 넘기고 화면에서 '자격 기준 미등록'으로 표시한다
        if (!ruledTypes.has(n.supplyType ?? '')) return { notice: n, codes: [], overridden: false, unverified: true };
        const codes = rules.filter((r) => r.supplyType === n.supplyType && matchedRules.includes(r.code)).map((r) => r.code);
        return { notice: n, codes, overridden: false, unverified: false };
      }
      const codes = rules
        .filter((r) => n.eligibility.some((e) => e.code === r.code))
        .filter((r) => evaluate(profile, applyOverride(r, n.eligibility.find((e) => e.code === r.code)), base).ok)
        .map((r) => r.code);
      return { notice: n, codes, overridden: true, unverified: false };
    });
  }

  /** 규칙·소득기준 조회부터 공고별 판정까지 한 번에. */
  async annotate(profile: ProfileInput, notices: Notice[]) {
    const [rules, base] = await Promise.all([this.rules(), this.incomeBase(profile.householdSize)]);
    const evaluations = rules.map((r) => evaluate(profile, r, base));
    return { rules, evaluations, matches: this.matchNotices(profile, rules, base, evaluations, notices) };
  }
}
