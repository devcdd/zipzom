import type { Notice, NoticeEligibility } from '../notices/notices.service.js';
import type { Profile, Rule } from './matcher.js';
import { MatchingService } from './matching.service.js';

const base = 3_813_363; // 1인 100%

const youthRule: Rule = {
  code: 'YOUTH', supplyType: '행복주택', label: '청년', minAge: 19, maxAge: 39, requiresUnmarried: true, marriageWithinYears: null, childMaxAge: null,
  incomePct: 100, dualIncomePct: null, bonusPct1p: 20, bonusPct2p: 10, assetLimit: 251_000_000, carLimit: 45_420_000, maxResidenceYears: 10,
};

const profile = {
  birthDate: '1995-03-10', maritalStatus: 'SINGLE', marriedAt: null, childrenCount: 0, youngestChildBirthDate: null,
  householdSize: 1, householdMonthlyIncome: 3_000_000, dualIncome: false, isHomeless: true, totalAssets: 50_000_000,
  carValue: 0, isStudent: false, isHousingBenefitRecipient: false, hasSubscriptionAccount: false, isIndustrialWorker: false, employedYears: null,
} satisfies Profile;

const elig = (code: string): NoticeEligibility => ({
  code, label: code, ageMin: null, ageMax: null, incomePct: null, dualIncomePct: null, assetLimit: null, carLimit: null, exempt: [], conditions: [],
});
const notice = (supplyType: string, eligibility: NoticeEligibility[]) =>
  ({ id: 1, supplyType, eligibility, houses: [] }) as unknown as Notice;

const service = new MatchingService(null as never);
const run = (n: Notice, rules: Rule[] = [youthRule]) => {
  const evaluations = rules.map((r) => ({ code: r.code, label: r.label, ok: true, checks: [] }));
  return service.matchNotices(profile as never, rules, base, evaluations as never, [n])[0];
};

describe('matchNotices', () => {
  it('규칙 없는 계층(OTHER)만 있는 공고는 탈락이 아니라 미검증', () => {
    const r = run(notice('매입임대', [elig('OTHER')]));
    expect(r.unverified).toBe(true);
    expect(r.codes).toEqual([]);
  });

  it('자격 0행 + 규칙 없는 유형도 미검증', () => {
    expect(run(notice('매입임대', [])).unverified).toBe(true);
  });

  it('규칙이 있는 계층은 그대로 판정한다', () => {
    const pass = run(notice('행복주택', [elig('YOUTH')]));
    expect(pass.unverified).toBe(false);
    expect(pass.codes).toEqual(['YOUTH']);

    // 소득 초과로 떨어지는 건 미검증이 아니라 탈락이어야 한다
    const rich = { ...profile, householdMonthlyIncome: 20_000_000 };
    const fail = service.matchNotices(rich as never, [youthRule], base, [] as never, [notice('행복주택', [elig('YOUTH')])])[0];
    expect(fail.unverified).toBe(false);
    expect(fail.codes).toEqual([]);
  });
});
