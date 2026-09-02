export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'ENGAGED';

export interface Profile {
  birthDate: string;
  maritalStatus: MaritalStatus;
  marriedAt: string | null;
  childrenCount: number;
  youngestChildBirthDate: string | null;
  householdSize: number;
  householdMonthlyIncome: number;
  dualIncome: boolean;
  isHomeless: boolean;
  totalAssets: number | null;
  carValue: number | null;
  isStudent: boolean;
  isHousingBenefitRecipient: boolean;
}

export interface Rule {
  code: string;
  label: string;
  minAge: number | null;
  maxAge: number | null;
  requiresUnmarried: boolean;
  marriageWithinYears: number | null;
  childMaxAge: number | null;
  incomePct: number | null;
  dualIncomePct: number | null;
  bonusPct1p: number;
  bonusPct2p: number;
  assetLimit: number | null;
  carLimit: number | null;
  maxResidenceYears: number | null;
}

export interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

export interface Evaluation {
  code: string;
  label: string;
  ok: boolean;
  checks: Check[];
}

const won = (n: number) => `${Math.round(n / 10_000).toLocaleString('ko-KR')}만원`;

/** 'YYYY-MM-DD' → 로컬 자정. new Date(iso)는 UTC 자정으로 파싱돼 로컬 getter와 섞이면 하루 밀린다 */
const localDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** 만 나이 (생일 안 지났으면 -1). */
export function ageOn(birthDate: string, today: Date): number {
  const b = localDate(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  const beforeBirthday =
    today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate());
  if (beforeBirthday) age--;
  return age;
}

const yearsSince = (date: string, today: Date) => (today.getTime() - localDate(date).getTime()) / (365.25 * 86_400_000);

/**
 * 행복주택 계층 1개에 대한 자격 판정.
 * incomeBase100 = 해당 가구원수의 도시근로자 월평균소득 100% (원).
 * ponytail: 계층 고유 조건(대학생·주거급여·한부모)은 rules 테이블 컬럼 대신 code 분기. 계층이 늘면 컬럼으로 승격
 */
export function evaluate(p: Profile, rule: Rule, incomeBase100: number, today = new Date()): Evaluation {
  const checks: Check[] = [];
  const age = ageOn(p.birthDate, today);
  const childAge = p.youngestChildBirthDate ? ageOn(p.youngestChildBirthDate, today) : null;

  checks.push({ label: '무주택', ok: p.isHomeless, detail: p.isHomeless ? '무주택세대구성원' : '주택 소유' });

  if (rule.minAge != null || rule.maxAge != null) {
    const ok = (rule.minAge == null || age >= rule.minAge) && (rule.maxAge == null || age <= rule.maxAge);
    checks.push({ label: '나이', ok, detail: `만 ${age}세 (기준 ${rule.minAge ?? ''}~${rule.maxAge ?? ''}세)` });
  }

  if (rule.requiresUnmarried) {
    const ok = p.maritalStatus === 'SINGLE';
    checks.push({ label: '혼인', ok, detail: ok ? '혼인 중 아님' : '혼인 중·예비부부는 해당 없음' });
  }

  if (rule.code === 'STUDENT') {
    checks.push({ label: '재학·졸업 2년 이내', ok: p.isStudent, detail: p.isStudent ? '해당' : '해당 없음' });
  }
  if (rule.code === 'HOUSING_BENEFIT') {
    checks.push({ label: '주거급여수급자', ok: p.isHousingBenefitRecipient, detail: p.isHousingBenefitRecipient ? '해당' : '해당 없음' });
  }

  if (rule.marriageWithinYears != null) {
    // 신혼부부: 혼인 N년 이내 또는 어린 자녀. 예비신혼부부는 혼인일 없이 통과
    const recentMarriage =
      p.maritalStatus === 'ENGAGED' ||
      (p.maritalStatus === 'MARRIED' && p.marriedAt != null && yearsSince(p.marriedAt, today) <= rule.marriageWithinYears);
    const youngChild = childAge != null && rule.childMaxAge != null && childAge <= rule.childMaxAge;
    const ok = (p.maritalStatus !== 'SINGLE' && recentMarriage) || (p.maritalStatus !== 'SINGLE' && youngChild);
    checks.push({
      label: '신혼·자녀',
      ok,
      detail: ok
        ? recentMarriage
          ? `혼인 ${rule.marriageWithinYears}년 이내`
          : `만 ${childAge}세 자녀`
        : `혼인 ${rule.marriageWithinYears}년 초과 및 만 ${rule.childMaxAge}세 이하 자녀 없음`,
    });
  } else if (rule.childMaxAge != null) {
    // 한부모: 혼인 중 아니면서 어린 자녀
    const ok = p.maritalStatus !== 'MARRIED' && childAge != null && childAge <= rule.childMaxAge;
    checks.push({ label: '한부모·자녀', ok, detail: ok ? `만 ${childAge}세 자녀` : `만 ${rule.childMaxAge}세 이하 자녀 없음 또는 혼인 중` });
  }

  if (rule.incomePct != null) {
    let pct = p.dualIncome && rule.dualIncomePct != null ? rule.dualIncomePct : rule.incomePct;
    pct += p.householdSize === 1 ? rule.bonusPct1p : p.householdSize === 2 ? rule.bonusPct2p : 0;
    const limit = (incomeBase100 * pct) / 100;
    const ok = p.householdMonthlyIncome <= limit;
    checks.push({ label: '소득', ok, detail: `월 ${won(p.householdMonthlyIncome)} / 기준 ${won(limit)} (${pct}%)` });
  }

  if (rule.assetLimit != null) {
    const ok = p.totalAssets == null || p.totalAssets <= rule.assetLimit;
    checks.push({ label: '총자산', ok, detail: p.totalAssets == null ? '미입력 (통과 처리)' : `${won(p.totalAssets)} / 기준 ${won(rule.assetLimit)}` });
  }

  if (rule.carLimit != null) {
    const ok = p.carValue == null || p.carValue === 0 || (rule.carLimit > 0 && p.carValue <= rule.carLimit);
    checks.push({
      label: '자동차',
      ok,
      detail: p.carValue == null || p.carValue === 0 ? '미보유' : rule.carLimit === 0 ? '소유 불가 계층' : `${won(p.carValue)} / 기준 ${won(rule.carLimit)}`,
    });
  }

  return { code: rule.code, label: rule.label, ok: checks.every((c) => c.ok), checks };
}
