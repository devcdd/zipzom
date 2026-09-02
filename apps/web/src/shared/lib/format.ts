/** 원 → 만/억 표기. 0·null은 미정(—). */
export const fmtWon = (n: number | null | undefined) =>
  n == null || n === 0
    ? '—'
    : n >= 100_000_000
      ? `${(n / 100_000_000).toFixed(1).replace(/\.0$/, '')}억`
      : `${Math.round(n / 10_000).toLocaleString('ko-KR')}만`;

/** 'YYYY-MM-DD' → 'MM.DD' */
export const fmtDate = (s: string | null | undefined) => (s ? s.slice(5).replace('-', '.') : '—');

/** 임대조건 한 줄. HUG 든든전세처럼 월세가 없는 공고는 '전세 보증금'으로 쓴다. */
export const fmtRent = (deposit: number | null | undefined, monthlyRent: number | null | undefined) =>
  !deposit && !monthlyRent ? null : !monthlyRent ? `전세 보증금 ${fmtWon(deposit)}` : `보증금 ${fmtWon(deposit)} · 월 ${fmtWon(monthlyRent)}`;

export const dday = (end: string | null | undefined) => {
  if (!end) return null;
  const d = Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000);
  return d < 0 ? null : d === 0 ? 'D-day' : `D-${d}`;
};

export const withinDays = (iso: string | null | undefined, days: number) =>
  !!iso && Date.now() - new Date(iso).getTime() < days * 86_400_000;

export const toWon = (manwon: string | number) => Math.round(Number(manwon || 0) * 10_000);
export const toManwon = (won: number | null | undefined) => (won == null ? '' : String(Math.round(won / 10_000)));

/** 'YYYY-MM-DD' → 오늘 기준 만 나이. new Date(iso)는 UTC 자정이라 로컬 getter와 섞이면 하루 밀려 직접 파싱 */
export const ageOn = (birthDate: string, today = new Date()) => {
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
};
