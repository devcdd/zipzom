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

export interface MyhomeAttachment {
  atchFileId: string;
  fileSn: string;
  name: string;
}

/**
 * 마이홈 공고 상세 페이지(raw.pcUrl)의 첨부 목록. API 응답엔 첨부가 없고 페이지에만 있다.
 * 링크가 fnDownFile('atchFileId','fileSn') 형태의 서버 렌더 HTML이라 JS 없이 정규식으로 읽는다 (2026-09 확인)
 */
export function parseMyhomeAttachments(html: string): MyhomeAttachment[] {
  return [...html.matchAll(/fnDownFile\('([^']+)',\s*'(\d+)'\)"\s*>\s*([^<]+?)\s*</g)].map((m) => ({ atchFileId: m[1], fileSn: m[2], name: m[3].trim() }));
}

export async function fetchMyhomeAttachments(pcUrl: string): Promise<MyhomeAttachment[]> {
  const res = await fetch(pcUrl, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`myhome page HTTP ${res.status}`);
  return parseMyhomeAttachments(await res.text());
}

/** 공고문 PDF. 이름에 '공고문'이 든 PDF 우선, 없으면 아무 PDF */
export const pickMyhomeNoticePdf = (files: MyhomeAttachment[]) => {
  const pdfs = files.filter((f) => /\.pdf$/i.test(f.name));
  return pdfs.find((f) => f.name.includes('공고문')) ?? pdfs[0];
};

/** 다운로드는 POST 폼. 세션·토큰 없음 */
export const MYHOME_FILE_DOWNLOAD_URL = 'https://www.myhome.go.kr/hws/com/fms/cvplFileDownload.do';
