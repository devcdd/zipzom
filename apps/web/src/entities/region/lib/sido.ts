import type { Region, Sido } from '../model/types';

// 법정동코드 시도 2자리 (2026 기준: 강원 51, 전북 52). 데이터에만 있는 시도는 regions에서 보충
export const SIDOS: Sido[] = [
  { code: '11', name: '서울특별시' },
  { code: '12', name: '전남광주통합특별시' }, // 2026 광주+전남 통합
  { code: '26', name: '부산광역시' },
  { code: '27', name: '대구광역시' },
  { code: '28', name: '인천광역시' },
  { code: '29', name: '광주광역시' },
  { code: '30', name: '대전광역시' },
  { code: '31', name: '울산광역시' },
  { code: '36', name: '세종특별자치시' },
  { code: '41', name: '경기도' },
  { code: '51', name: '강원특별자치도' },
  { code: '43', name: '충청북도' },
  { code: '44', name: '충청남도' },
  { code: '52', name: '전북특별자치도' },
  { code: '46', name: '전라남도' },
  { code: '47', name: '경상북도' },
  { code: '48', name: '경상남도' },
  { code: '50', name: '제주특별자치도' },
];

export const isSidoCode = (code: string) => code.endsWith('000');

// 서울·경기는 수요가 커서 항상 맨 앞. 나머지는 가나다순
const PINNED_SIDOS = ['11', '41'];
const sidoRank = (code: string) => (PINNED_SIDOS.includes(code) ? PINNED_SIDOS.indexOf(code) : PINNED_SIDOS.length);

/** 기본 시도 목록 + 수집 데이터에만 있는 시도(예: 통합특별시) 합치기. */
export function mergeSidos(regions: Region[] = []): Sido[] {
  const known = new Map(SIDOS.map((s) => [s.code, s.name]));
  for (const r of regions) if (!known.has(r.sidoCode)) known.set(r.sidoCode, r.name.split(' ')[0]);
  return [...known].map(([code, name]) => ({ code, name }));
}

/** 시도별 그룹. 시도 전체('XX000') 행이 없으면 만들어 맨 앞에 둔다. */
export function groupBySido(regions: Region[], sidos: Sido[]) {
  const groups = new Map<string, { sido: Sido; regions: Region[] }>();
  for (const r of regions) {
    const sido = sidos.find((s) => s.code === r.sidoCode) ?? { code: r.sidoCode, name: r.name.split(' ')[0] };
    const g = groups.get(r.sidoCode) ?? { sido, regions: [] };
    g.regions.push(r);
    groups.set(r.sidoCode, g);
  }
  for (const g of groups.values()) {
    g.regions.sort((a, b) => Number(isSidoCode(b.code)) - Number(isSidoCode(a.code)) || a.name.localeCompare(b.name, 'ko'));
    if (!g.regions.some((r) => isSidoCode(r.code))) {
      g.regions.unshift({ code: `${g.sido.code}000`, sidoCode: g.sido.code, name: g.sido.name, houseCount: g.regions.reduce((s, r) => s + r.houseCount, 0) });
    }
  }
  return [...groups.values()].sort((a, b) => sidoRank(a.sido.code) - sidoRank(b.sido.code) || a.sido.name.localeCompare(b.sido.name, 'ko'));
}

export const regionLabel = (r: Region) => (isSidoCode(r.code) ? `${r.name.split(' ')[0]} 전체` : r.name.split(' ').slice(1).join(' ') || r.name);
