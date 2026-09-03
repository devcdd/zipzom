export interface ShListRow {
  no: number; // 게시판 글번호. 1페이지 첫 행이 곧 게시판 총 건수다
  seq: string;
  title: string;
  postedOn: string; // YYYY-MM-DD
}

export interface ShListPage {
  rows: ShListRow[];
  lastPage: number;
}

const listUrl = (page: number) => {
  const u = new URL(process.env.SH_LIST_URL!);
  u.searchParams.set('page', String(page));
  return u;
};

/** 게시글 상세. 목록의 getDetailView는 폼 POST지만 seq를 GET으로 붙여도 같은 페이지가 나온다. */
export const shViewUrl = (seq: string) => new URL(`view.do?seq=${seq}`, process.env.SH_LIST_URL!).toString();

// 옛 공고 본문에 NUL이 섞여 있다. jsonb·text 어디에 넣어도 Postgres가 22P05로 거부한다
// oxlint-disable-next-line no-control-regex
const squash = (s: string) => s.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
const stripTags = (html: string) => squash(html.replace(/<[^>]+>/g, ' '));

/** 목록 한 페이지의 글 행. 검색 폼에도 <tr>이 있어 getDetailView가 있는 행만 본다. */
export function parseShList(html: string): ShListRow[] {
  const rows: ShListRow[] = [];
  for (const [, tr] of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const a = tr.match(/getDetailView\('(\d+)'\)[^>]*>([\s\S]*?)<\/a>/);
    const date = tr.match(/(20\d\d-\d\d-\d\d)/);
    if (!a || !date) continue;
    rows.push({
      no: Number(tr.match(/<td>\s*(\d+)\s*<\/td>/)?.[1] ?? 0),
      seq: a[1],
      // 제목 앞에 NEW 배지 span이 붙는다 (내용까지 지워야 제목에 안 섞인다)
      title: stripTags(a[2].replace(/<span class="ico[^"]*">[\s\S]*?<\/span>/g, '')),
      postedOn: date[1],
    });
  }
  return rows;
}

/** 마지막 페이지 번호. 페이징의 '맨끝' 버튼에만 총 페이지가 들어 있다. */
export const parseShLastPage = (html: string) => Number(html.match(/getPaging\((\d+),\s*null\);return false" class="btnLast"/)?.[1] ?? 1);

const getSh = async (url: string | URL) => {
  // user-agent 없으면 307 리다이렉트 루프로 막힌다 (2026-09 확인)
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`sh HTTP ${res.status} ${url}`);
  return res.text();
};

export async function fetchShListPage(page: number): Promise<ShListPage> {
  const html = await getSh(listUrl(page));
  return { rows: parseShList(html), lastPage: parseShLastPage(html) };
}

/**
 * 상세 페이지에서 본문 영역만 잘라낸다. 이 뒤로는 이전글/다음글 표라 다른 공고의 제목·날짜가 섞인다.
 * 본문에 표가 들어간 공고가 있어 첫 </table>로 끊지 않는다.
 */
export function shDetailBody(html: string): string {
  const i = html.indexOf('class="detailTable');
  // 삭제된 글 등 본문 표가 없는 페이지. 통째로 넘기면 좌우 메뉴 날짜를 일정으로 잘못 읽는다
  if (i < 0) return '';
  const end = html.indexOf('이전글/다음글', i);
  return html.slice(i, end < 0 ? html.indexOf('</table>', i) + 8 || undefined : end);
}

export const fetchShDetail = (seq: string) => getSh(shViewUrl(seq));

// 게시판의 splyTy 분류는 담당 부서가 잘못 붙이는 일이 잦아(매입임대 공고가 도시형생활주택으로) 제목으로 판단한다
const SUPPLY_TYPES: [RegExp, string][] = [
  [/행복주택/, '행복주택'],
  [/장기전세|미리내집/, '장기전세'],
  [/청년안심주택/, '청년안심주택'],
  [/매입임대/, '매입임대'],
  [/전세임대/, '전세임대'],
  [/재개발임대/, '재개발임대'],
  [/장기안심/, '장기안심주택'],
  [/희망하우징/, '희망하우징'],
  [/도시형생활주택/, '도시형생활주택'],
  [/사회주택|두레주택/, '사회주택'],
  [/국민임대|공공임대|영구임대/, '국민임대'],
];
// 당첨자·서류심사 발표문은 모집공고와 같은 제목을 달고 올라온다. 유형을 붙이면 목록에 모집 중으로 잡혀 제외한다
const ANNOUNCEMENT = /당첨자|발표|결과|선정|계약\s*안내|공급순번|재계약/;

/** 공고 제목 → notices.supply_type. 입주자 모집공고가 아니면 null (수집은 하되 서비스 목록에는 안 뜬다). */
export function shSupplyType(title: string): string | null {
  if (ANNOUNCEMENT.test(title) || !/모집\s*공고|입주자\s*모집|모집\s*안내/.test(title)) return null;
  return SUPPLY_TYPES.find(([re]) => re.test(title))?.[1] ?? null;
}

export interface ShNoticeDetail {
  applyBeginOn: string | null; // YYYY-MM-DD
  applyEndOn: string | null;
  winnerAnnounceOn: string | null;
  supplyCount: number | null; // 신규+재공급 합
}

const iso = (y: string, m: string, d: string) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
const D = String.raw`(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})`;

/** 본문 HTML → 평문. 옛 공고는 본문이 엔티티로 이스케이프된 채 저장돼 있어 한 번 푼다. */
export function shBodyText(raw: string): string {
  let s = raw
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
  s = s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ');
  return squash(s);
}

/**
 * SH 공고 본문 텍스트에서 일정·공급호수 추출. 서식이 공고마다 조금씩 달라 best-effort — 못 찾으면 null.
 * 단지 목록은 첨부 PDF에만 있어 여기선 못 얻는다.
 */
export function parseShNotice(html: string): ShNoticeDetail {
  const text = shBodyText(html);

  // 접수: "인터넷 접수 : 2026. 9. 9.( 수 ) 10:00 ~ 9. 11.( 금 ) 17:00" (끝쪽 연도 생략 가능)
  // 매입임대는 '청약신청', 행복주택은 '인터넷 접수'로 쓰는 등 머리말이 유형마다 다르다
  let applyBeginOn: string | null = null;
  let applyEndOn: string | null = null;
  const apply = text.match(new RegExp(String.raw`(?:인터넷\s*접수|청약\s*신청|신청\s*접수|접수\s*일?(?:시|간)?)\s*[:：]?\s*${D}[^~]{0,30}~\s*(?:(\d{4})\.\s*)?(\d{1,2})\.\s*(\d{1,2})`));
  if (apply) {
    applyBeginOn = iso(apply[1], apply[2], apply[3]);
    applyEndOn = iso(apply[4] ?? apply[1], apply[5], apply[6]);
  }

  const winner = text.match(new RegExp(String.raw`당첨자\s*발표\s*[:：]?\s*${D}`));
  const winnerAnnounceOn = winner ? iso(winner[1], winner[2], winner[3]) : null;

  // "공급호수 : 신규공급 154 호 , 재공급 1,330 호" → 근처의 "N 호" 전부 합산
  let supplyCount: number | null = null;
  const supplyIdx = text.indexOf('공급호수');
  if (supplyIdx >= 0) {
    const near = text.slice(supplyIdx, supplyIdx + 120);
    const counts = [...near.matchAll(/([\d,]+)\s*호/g)].map((m) => Number(m[1].replace(/,/g, '')));
    if (counts.length) supplyCount = counts.reduce((a, b) => a + b, 0);
  }

  return { applyBeginOn, applyEndOn, winnerAnnounceOn, supplyCount };
}

export interface ShAttachment {
  fileSeq: string;
  name: string;
  url: string;
}

/** 상세 페이지 스크립트의 initParam.downList. 링크는 Innorix 에이전트용 onclick이지만 innoFD.do는 인증 없이 직접 응답한다 (2026-09 확인). */
export function parseShAttachments(html: string): ShAttachment[] {
  const m = html.match(/initParam\.downList\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return [];
  const list = JSON.parse(m[1]) as { brdId: string; seq: string; fileSeq: string; oriFileNm: string; fileTp: string }[];
  return list.map((f) => ({
    fileSeq: f.fileSeq,
    name: f.oriFileNm,
    url: `https://www.i-sh.co.kr/main/com/file/innoFD.do?brdId=${f.brdId}&seq=${f.seq}&fileTp=${f.fileTp}&fileSeq=${f.fileSeq}`,
  }));
}

export async function fetchShAttachments(viewUrl: string): Promise<ShAttachment[]> {
  return parseShAttachments(await getSh(viewUrl));
}

/** 공고문 본문 PDF. 첨부가 여럿이면(위임장 등) 이름에 '공고문'이 들어간 것 우선. */
export const pickShNoticePdf = (files: ShAttachment[]) => {
  const pdfs = files.filter((f) => /\.pdf$/i.test(f.name));
  return pdfs.find((f) => f.name.includes('공고문')) ?? pdfs[0];
};
