/**
 * 같은 공고가 마이홈·LH 양쪽에 올라오고, LH 안에서도 정정공고가 원본과 같은 제목으로 다시 올라온다.
 * 제목을 정규화해 묶은 뒤 대표 1건만 남기고 나머지에 duplicate_of를 채운다.
 */

/**
 * 병합 키. 말머리 대괄호와 날짜 괄호만 떼고 나머지 괄호는 남긴다.
 * '완주삼봉(A-1,A-3BL)'처럼 괄호 안이 블록 번호인 경우가 있어 통째로 지우면 다른 공고와 붙는다.
 */
export function mergeKey(title: string): string {
  return title
    .replace(/\[[^\]]*\]/g, ' ') // [정정공고], [리츠] 등 말머리
    .replace(/\(\s*['‘’]?\d{2,4}\s*[.\-/]\s*\d{1,2}\s*[.\-/]?\s*\d{0,2}\s*\.?\s*\)/g, ' ') // ('26.08.18) (‘26.08.18) (2026.08.19.) — 마이홈은 곧은 따옴표, LH는 굽은 따옴표
    .replace(/[\s·・,]+/g, '')
    .replace(/[.]+$/, '')
    .toLowerCase();
}

export interface DedupeRow {
  id: number;
  source: string;
  title: string;
  postedOn: string | null;
  houseCount: number;
}

/** 대표는 단지 정보가 많은 쪽 → 최신 공고일 → 마이홈 우선 → 큰 id. */
const SOURCE_RANK: Record<string, number> = { MYHOME: 3, SH: 2, HUG: 2, LH: 1 };

export function pickCanonical(group: DedupeRow[]): DedupeRow {
  return [...group].sort(
    (a, b) =>
      b.houseCount - a.houseCount ||
      (b.postedOn ?? '').localeCompare(a.postedOn ?? '') ||
      (SOURCE_RANK[b.source] ?? 0) - (SOURCE_RANK[a.source] ?? 0) ||
      b.id - a.id,
  )[0]!;
}

export interface MergeLink {
  duplicateId: number;
  canonicalId: number;
}

/** 병합 대상만 반환. 그룹이 1건이면 아무것도 내지 않는다. */
export function planMerges(rows: DedupeRow[]): MergeLink[] {
  const groups = new Map<string, DedupeRow[]>();
  for (const r of rows) {
    const key = mergeKey(r.title);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const links: MergeLink[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const canonical = pickCanonical(group);
    for (const r of group) if (r.id !== canonical.id) links.push({ duplicateId: r.id, canonicalId: canonical.id });
  }
  return links;
}
