import { ageOn, evaluate, type Profile, type Rule } from './matcher.js';

const today = new Date(2026, 8, 1);
const base = 3_813_363; // 1인 100%

const youth: Rule = {
  code: 'YOUTH', label: '청년', minAge: 19, maxAge: 39, requiresUnmarried: true, marriageWithinYears: null, childMaxAge: null,
  incomePct: 100, dualIncomePct: null, bonusPct1p: 20, bonusPct2p: 10, assetLimit: 251_000_000, carLimit: 45_420_000, maxResidenceYears: 10,
};
const newlywed: Rule = { ...youth, code: 'NEWLYWED', label: '신혼', minAge: null, maxAge: null, requiresUnmarried: false, marriageWithinYears: 7, childMaxAge: 6, dualIncomePct: 120, assetLimit: 345_000_000 };

const single: Profile = {
  birthDate: '1995-03-10', maritalStatus: 'SINGLE', marriedAt: null, childrenCount: 0, youngestChildBirthDate: null,
  householdSize: 1, householdMonthlyIncome: 4_000_000, dualIncome: false, isHomeless: true, totalAssets: 50_000_000,
  carValue: 0, isStudent: false, isHousingBenefitRecipient: false,
};

describe('matcher', () => {
  it('만 나이', () => {
    expect(ageOn('1995-03-10', today)).toBe(31);
    expect(ageOn('1995-09-02', today)).toBe(30);
  });

  it('만 나이: 생일 경계가 하루 밀리지 않는다', () => {
    expect(ageOn('1995-03-13', new Date(2026, 2, 12))).toBe(30);
    expect(ageOn('1995-03-13', new Date(2026, 2, 13))).toBe(31);
  });

  it('청년: 1인 가구 20%p 가산으로 소득 통과', () => {
    const r = evaluate(single, youth, base, today);
    expect(r.ok).toBe(true);
    expect(r.checks.find((c) => c.label === '소득')?.detail).toContain('120%');
  });

  it('청년: 혼인 중이면 탈락', () => {
    expect(evaluate({ ...single, maritalStatus: 'MARRIED', marriedAt: '2024-01-01' }, youth, base, today).ok).toBe(false);
  });

  it('신혼부부: 7년 이내 혼인 + 맞벌이 120%', () => {
    const p: Profile = { ...single, maritalStatus: 'MARRIED', marriedAt: '2022-05-01', householdSize: 2, dualIncome: true, householdMonthlyIncome: 7_000_000 };
    const r = evaluate(p, newlywed, 5_866_270, today);
    expect(r.ok).toBe(true); // 120 + 10 = 130% → 762만
    expect(evaluate({ ...p, marriedAt: '2015-01-01' }, newlywed, 5_866_270, today).ok).toBe(false);
  });

  it('주택 소유면 어떤 계층도 탈락', () => {
    expect(evaluate({ ...single, isHomeless: false }, youth, base, today).ok).toBe(false);
  });
});
