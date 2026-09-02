export interface MyhomeItem {
  pblancId: string;
  houseSn: number;
  sttusNm: string;
  pblancNm: string;
  suplyInsttNm: string;
  houseTyNm: string;
  suplyTyNm: string;
  beforePblancId: string;
  rcritPblancDe: string;
  przwnerPresnatnDe: string;
  refrnc: string;
  url: string;
  pcUrl: string;
  mobileUrl: string;
  hsmpNm: string;
  brtcNm: string;
  signguNm: string;
  fullAdres: string;
  pnu: string;
  heatMthdNm: string;
  totHshldCo: number | string;
  sumSuplyCo: number | string;
  rentGtn: number | string;
  mtRntchrg: number | string;
  beginDe: string;
  endDe: string;
}

const BASE = 'https://apis.data.go.kr/1613000/HWSPR02/rsdtRcritNtcList';

// 공고월 범위로 전량 조회. 유형 필터(houseTy 코드)는 코드표가 없어 클라이언트에서 suplyTyNm으로 거름
export async function fetchMyhomeNotices(yearMtBegin: string, yearMtEnd: string): Promise<MyhomeItem[]> {
  const items: MyhomeItem[] = [];
  for (let pageNo = 1; ; pageNo++) {
    const url = new URL(BASE);
    url.search = new URLSearchParams({
      serviceKey: process.env.DATA_GO_KR_SERVICE_KEY ?? '',
      numOfRows: '500',
      pageNo: String(pageNo),
      yearMtBegin,
      yearMtEnd,
    }).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`myhome HTTP ${res.status}`);
    const json = (await res.json()) as {
      response: { header: { resultCode: string; resultMsg: string }; body?: { totalCount: string; item?: MyhomeItem[] } };
    };
    const { header, body } = json.response;
    if (header.resultCode !== '00') throw new Error(`myhome ${header.resultCode} ${header.resultMsg}`);
    const page = body?.item ?? [];
    items.push(...page);
    if (items.length >= Number(body?.totalCount ?? 0) || page.length === 0) return items;
  }
}
