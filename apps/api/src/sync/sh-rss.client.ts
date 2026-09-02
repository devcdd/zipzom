export interface ShRssItem {
  seq: string;
  title: string;
  link: string;
  publishedAt: Date;
  html: string;
}

export interface ShNoticeDetail {
  applyBeginOn: string | null; // YYYY-MM-DD
  applyEndOn: string | null;
  winnerAnnounceOn: string | null;
  supplyCount: number | null; // 신규+재공급 합
}

const iso = (y: string, m: string, d: string) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
const D = String.raw`(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})`;

/** 본문 HTML(RSS는 엔티티 이스케이프됨) → 평문. */
export function shBodyText(raw: string): string {
  let s = raw
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
  s = s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * SH 공고 본문 텍스트에서 일정·공급호수 추출. 서식이 공고마다 조금씩 달라 best-effort — 못 찾으면 null.
 * 단지 목록은 첨부 PDF에만 있어 여기선 못 얻는다.
 */
export function parseShNotice(html: string): ShNoticeDetail {
  const text = shBodyText(html);

  // 접수: "인터넷 접수 : 2026. 9. 9.( 수 ) 10:00 ~ 9. 11.( 금 ) 17:00" (끝쪽 연도 생략 가능)
  let applyBeginOn: string | null = null;
  let applyEndOn: string | null = null;
  const apply = text.match(new RegExp(String.raw`(?:인터넷\s*접수|신청\s*접수|접수\s*일?(?:시|간)?)\s*[:：]?\s*${D}[^~]{0,30}~\s*(?:(\d{4})\.\s*)?(\d{1,2})\.\s*(\d{1,2})`));
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

const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').trim() : '';
};

// SH 공고·공지 RSS. EUC-KR, 전 카테고리 혼합. 제목에 행복주택이 들어간 글만 반환
export async function fetchShHappyHouseNotices(): Promise<ShRssItem[]> {
  const res = await fetch(process.env.SH_RSS_URL!, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`sh rss HTTP ${res.status}`);
  const xml = new TextDecoder('euc-kr').decode(await res.arrayBuffer());
  const items: ShRssItem[] = [];
  for (const [, block] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const title = tag(block, 'title');
    if (!/행복주택/.test(title)) continue;
    const link = tag(block, 'link');
    const seq = new URL(link).searchParams.get('seq');
    if (!seq) continue;
    items.push({ seq, title, link, publishedAt: new Date(tag(block, 'pubDate')), html: tag(block, 'content:encoded') });
  }
  return items;
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
  const res = await fetch(viewUrl, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`sh view HTTP ${res.status}`);
  return parseShAttachments(await res.text());
}

/** 공고문 본문 PDF. 첨부가 여럿이면(위임장 등) 이름에 '공고문'이 들어간 것 우선. */
export const pickShNoticePdf = (files: ShAttachment[]) => {
  const pdfs = files.filter((f) => /\.pdf$/i.test(f.name));
  return pdfs.find((f) => f.name.includes('공고문')) ?? pdfs[0];
};
