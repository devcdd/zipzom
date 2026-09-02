/**
 * LH 청약플러스 공고 API (data.go.kr 15058530 목록 · 15057999 상세). 마이홈이 LH 공고를 전부 싣지 않아 별도 수집하고,
 * 마이홈 공고의 url(청약플러스 상세 링크)로도 같은 상세 API를 불러 공고문 PDF를 얻는다.
 * 상세 API는 SPL_INF_TP_CD가 빠지면 빈 응답을 준다 — 이 값은 목록 응답에만 있어, 마이홈 경로에선 목록 색인으로 보충한다.
 */
export interface LhNotice {
  PAN_ID: string;
  PAN_NM: string;
  AIS_TP_CD_NM: string; // 행복주택 등
  UPP_AIS_TP_NM?: string;
  PAN_SS: string; // 공고중 · 접수중 · 접수마감 …
  PAN_NT_ST_DT: string; // 2026.08.31
  CLSG_DT: string;
  DTL_URL: string;
  CNP_CD_NM?: string;
  SPL_INF_TP_CD: string;
  CCR_CNNT_SYS_DS_CD: string;
  UPP_AIS_TP_CD: string;
  AIS_TP_CD: string;
}

export interface LhPanKey {
  panId: string;
  ccrCnntSysDsCd: string;
  uppAisTpCd: string;
  aisTpCd: string;
}

export interface LhFile {
  kind: string; // 공고문(PDF) 등 파일구분명
  name: string;
  url: string;
}

export interface LhSchedule {
  SBD_LGO_NM?: string;
  SBSC_ACP_ST_DT?: string;
  SBSC_ACP_CLSG_DT?: string;
  PZWR_ANC_DT?: string;
}

export interface LhComplex {
  LCC_NT_NM?: string;
  LGDN_ADR?: string;
  LGDN_DTL_ADR?: string;
  HSH_CNT?: string;
  DDO_AR?: string;
  MVIN_XPC_YM?: string;
}

export interface LhDetail {
  schedule?: LhSchedule;
  complexes: LhComplex[];
  files: LhFile[];
}

/** "26.95~44.68" · "36.78" → ㎡ 범위. 못 읽으면 null */
export function parseArea(s: string | null | undefined): { min: number; max: number } | null {
  const nums = (s ?? '').match(/\d+(?:\.\d+)?/g)?.map(Number).filter((n) => n > 0);
  if (!nums?.length) return null;
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

export const lhEnabled = () => !!process.env.DATA_GO_KR_SERVICE_KEY;

/** '2026.08.31' → '2026-08-31'. 빈 값·형식 불일치는 null */
export const lhDate = (s: string | null | undefined): string | null => {
  const m = s?.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

const key = () => encodeURIComponent(process.env.DATA_GO_KR_SERVICE_KEY ?? '');
const ymd = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

/** 마이홈 raw.url(청약플러스 상세 링크)에서 상세 API 파라미터 추출. LH 링크가 아니면 null */
export function parseLhParams(url: string | null | undefined): LhPanKey | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('lh.or.kr')) return null;
    const p = u.searchParams;
    const panId = p.get('panId');
    if (!panId) return null;
    return { panId, ccrCnntSysDsCd: p.get('ccrCnntSysDsCd') ?? '', uppAisTpCd: p.get('uppAisTpCd') ?? '', aisTpCd: p.get('aisTpCd') ?? '' };
  } catch {
    return null;
  }
}

/** 응답은 배열 안에 데이터셋별 키가 흩어져 있어 하나로 합친다. 포털 오류는 cmmMsgHeader로 온다 */
async function getJson(url: URL): Promise<Record<string, unknown[]>> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`lh api HTTP ${res.status}`);
  const j = (await res.json()) as unknown;
  const arr = Array.isArray(j) ? j : [j];
  const merged: Record<string, unknown[]> = {};
  for (const o of arr as Record<string, unknown>[]) {
    const header = (o.cmmMsgHeader ?? (o.OpenAPI_ServiceResponse as { cmmMsgHeader?: unknown })?.cmmMsgHeader) as { errMsg?: string } | undefined;
    if (header?.errMsg) throw new Error(`lh api: ${header.errMsg}`);
    for (const [k, v] of Object.entries(o)) if (Array.isArray(v)) merged[k] = [...(merged[k] ?? []), ...v];
  }
  return merged;
}

/** 임대주택 공고 목록. 게시일 최근 4개월 ~ 마감 1년 후 윈도우, 500건씩 페이징 */
export async function fetchLhNotices(): Promise<LhNotice[]> {
  const from = new Date();
  from.setMonth(from.getMonth() - 4);
  const to = new Date();
  to.setFullYear(to.getFullYear() + 1);
  const out: LhNotice[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = new URL('https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1');
    url.search = `ServiceKey=${key()}&PG_SZ=500&PAGE=${page}&UPP_AIS_TP_CD=06&PAN_NT_ST_DT=${ymd(from)}&CLSG_DT=${ymd(to)}`;
    const rows = ((await getJson(url)).dsList ?? []) as LhNotice[];
    out.push(...rows);
    if (rows.length < 500) break;
  }
  return out;
}

/** PAN_ID → SPL_INF_TP_CD 색인 (마이홈 url엔 이 코드가 없어서) */
export async function fetchLhSplCodes(): Promise<Map<string, string>> {
  return new Map((await fetchLhNotices()).map((n) => [n.PAN_ID, n.SPL_INF_TP_CD]));
}

async function fetchDetailRaw(k: LhPanKey, splInfTpCd: string) {
  const url = new URL('https://apis.data.go.kr/B552555/lhLeaseNoticeDtlInfo1/getLeaseNoticeDtlInfo1');
  url.search = `ServiceKey=${key()}&SPL_INF_TP_CD=${splInfTpCd}&CCR_CNNT_SYS_DS_CD=${k.ccrCnntSysDsCd}&PAN_ID=${k.panId}&UPP_AIS_TP_CD=${k.uppAisTpCd}&AIS_TP_CD=${k.aisTpCd}`;
  return getJson(url);
}

const toFiles = (rows: unknown[]) =>
  (rows as { AHFL_URL: string; SL_PAN_AHFL_DS_CD_NM: string; CMN_AHFL_NM: string }[]).map((r) => ({
    kind: r.SL_PAN_AHFL_DS_CD_NM,
    name: r.CMN_AHFL_NM,
    url: r.AHFL_URL,
  }));

/** 공고 상세: 단지(dsSbd)·일정(dsSplScdl, 첫 단지 기준)·첨부(dsAhflInfo) */
export async function fetchLhDetail(n: LhNotice): Promise<LhDetail> {
  const d = await fetchDetailRaw({ panId: n.PAN_ID, ccrCnntSysDsCd: n.CCR_CNNT_SYS_DS_CD, uppAisTpCd: n.UPP_AIS_TP_CD, aisTpCd: n.AIS_TP_CD }, n.SPL_INF_TP_CD);
  return {
    schedule: (d.dsSplScdl as LhSchedule[] | undefined)?.[0],
    complexes: (d.dsSbd as LhComplex[] | undefined) ?? [],
    files: toFiles(d.dsAhflInfo ?? []),
  };
}

/** 단지 목록만 (마이홈 공고의 면적 보강용) */
export async function fetchLhComplexes(k: LhPanKey, splInfTpCd: string): Promise<LhComplex[]> {
  return ((await fetchDetailRaw(k, splInfTpCd)).dsSbd as LhComplex[] | undefined) ?? [];
}

/** 첨부 목록만 (마이홈 공고 경로용) */
export async function fetchLhFiles(k: LhPanKey, splInfTpCd: string): Promise<LhFile[]> {
  return toFiles((await fetchDetailRaw(k, splInfTpCd)).dsAhflInfo ?? []);
}

export const pickLhNoticePdf = (files: LhFile[]) => files.find((f) => /PDF/i.test(f.kind)) ?? files.find((f) => /\.pdf$/i.test(f.name));
