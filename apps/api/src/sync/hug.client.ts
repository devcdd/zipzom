/**
 * HUG 든든전세주택 모집공고. 공공데이터포털 15143827 (LINK 유형 — 포털 경유가 아니라 HUG 자체 엔드포인트).
 * 활용신청 후 받은 전체 URL(인증키 포함)을 HUG_JEONSE_API_URL에 그대로 넣는다.
 *
 * 응답은 (공고 × 주택) 평면 배열이고 필드명이 한글이다. 컬럼명은 같은 데이터셋의
 * 파일데이터 명세(15139525, 15개 항목)를 따랐다.
 */
export interface HugJeonseRow {
  모집공고일자: string;
  모집공고시작시간?: string;
  청약접수시작일자?: string;
  청약접수시작시간?: string;
  청약접수종료일자?: string;
  청약접수종료시간?: string;
  당첨예정발표일자?: string;
  서류제출대상자발표일자?: string;
  지역구분명?: string;
  지역상세구분코드명?: string;
  '전용면적(제곱미터)'?: string;
  '임대보증금액(원)'?: string;
  주택형태?: string;
  계약시작일자?: string;
  계약종료일자?: string;
}

interface HugError {
  ERROR_CODE?: string;
  ERROR_MSG?: string;
}

export const hugEnabled = () => !!process.env.HUG_JEONSE_API_URL;

/** 모집기간이 아니면 빈 배열. HUG는 이때 데이터를 지우고 NO_DATA 오류 객체를 내려준다. */
export async function fetchHugJeonseRows(): Promise<HugJeonseRow[]> {
  const url = process.env.HUG_JEONSE_API_URL;
  if (!url) return [];
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`hug HTTP ${res.status}`);
  const json: unknown = await res.json();
  const rows = Array.isArray(json) ? json : [];
  const err = rows.find((r): r is HugError => typeof r === 'object' && r !== null && 'ERROR_CODE' in r);
  if (err) {
    if (err.ERROR_MSG === 'NO_DATA') return [];
    throw new Error(`hug ${err.ERROR_CODE} ${err.ERROR_MSG}`);
  }
  return rows.filter((r): r is HugJeonseRow => typeof r === 'object' && r !== null && !!(r as HugJeonseRow).모집공고일자);
}

export interface HugNotice {
  postedOn: string;
  applyBeginOn: string | null;
  applyEndOn: string | null;
  winnerAnnounceOn: string | null;
  title: string;
  /** 시군구 단위 묶음. HUG는 주소·단지명을 주지 않아 지역명이 유일한 위치 정보다 */
  areas: { key: string; address: string; supplyCount: number; minDeposit: number | null }[];
  raw: HugJeonseRow[];
}

const ymd = (v: string | undefined) => (v && /^\d{8}$/.test(v.trim()) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : null);
/** '2026-07-24' → '2026.7.24' (공고문 제목 표기) */
const dot = (iso: string) => iso.split('-').map(Number).join('.');
const won = (v: string | undefined) => {
  const n = Number(String(v ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** 평면 행을 공고 단위로 묶는다. 행 1건 = 주택 1호라 시군구별로 호수를 세고 최저 보증금을 잡는다. */
export function groupHugNotices(rows: HugJeonseRow[]): HugNotice[] {
  const byNotice = new Map<string, HugJeonseRow[]>();
  for (const r of rows) {
    const key = r.모집공고일자?.trim();
    if (!key) continue;
    byNotice.set(key, [...(byNotice.get(key) ?? []), r]);
  }

  return [...byNotice].map(([postedRaw, group]) => {
    const areas = new Map<string, { key: string; address: string; supplyCount: number; minDeposit: number | null }>();
    for (const r of group) {
      const sido = (r.지역구분명 ?? '').trim();
      const sigungu = (r.지역상세구분코드명 ?? '').trim();
      const address = [sido, sigungu].filter(Boolean).join(' ');
      if (!address) continue;
      const deposit = won(r['임대보증금액(원)']);
      const hit = areas.get(address) ?? { key: address, address, supplyCount: 0, minDeposit: null };
      hit.supplyCount += 1;
      if (deposit != null) hit.minDeposit = hit.minDeposit == null ? deposit : Math.min(hit.minDeposit, deposit);
      areas.set(address, hit);
    }
    const posted = ymd(postedRaw);
    const first = group[0];
    return {
      postedOn: posted ?? postedRaw,
      applyBeginOn: ymd(first?.청약접수시작일자),
      applyEndOn: ymd(first?.청약접수종료일자),
      winnerAnnounceOn: ymd(first?.당첨예정발표일자),
      // HUG는 공고명을 내려주지 않아 공고문 표기 형식을 그대로 만든다
      title: `HUG 든든전세주택 입주자 모집 공고${posted ? ` [${dot(posted)}]` : ''}`,
      areas: [...areas.values()],
      raw: group,
    };
  });
}
