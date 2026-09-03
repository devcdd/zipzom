import type { Notice } from '../model/types';

export type MatchedNotice = Notice & { matchedCodes: string[] };

/** 내 계층에 배정된 단지가 하나라도 있는 공고 */
export const isForMe = (n: MatchedNotice) => n.houses.some((h) => (h.eligibleGroups ?? []).some((g) => n.matchedCodes.includes(g)));

/** 지도에서 고른 공고 → 내 계층 배정 단지가 있는 공고 → 나머지. 안정 정렬이라 그 안에서는 서버 순서 유지 */
export function sortForMe<T extends MatchedNotice>(list: T[], selectedId: number | null): T[] {
  return [...list].sort((a, b) => {
    const sel = Number(b.id === selectedId) - Number(a.id === selectedId);
    return sel || Number(isForMe(b)) - Number(isForMe(a));
  });
}
