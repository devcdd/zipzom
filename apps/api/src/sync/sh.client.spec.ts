import { parseShAttachments, parseShLastPage, parseShList, parseShNotice, pickShNoticePdf, shDetailBody, shSupplyType } from './sh.client.js';

// 2026년 2차 행복주택 공고(seq 309337) 본문 실물 축약
const BODY = [
  '&lt;p&gt;&lt;span&gt;■ 모집공고일&lt;/span&gt;&lt;span&gt;: 2026. 8. 28. (&lt;/span&gt;&lt;span&gt;금&lt;/span&gt;&lt;span&gt;)&lt;/span&gt;&lt;/p&gt;',
  '&lt;p&gt;&lt;span&gt;■ 공급호수&lt;/span&gt;&lt;span&gt;: 신규공급 154호, 재공급 1,330호 (예비입주자 모집 포함)&lt;/span&gt;&lt;/p&gt;',
  '&lt;p&gt;&lt;span&gt;○ 인터넷 접수&lt;/span&gt;&lt;span&gt;: 2026. 9. 9.(수) 10:00 ~ 9. 11.(금) 17:00&lt;/span&gt;&lt;/p&gt;',
  '&lt;p&gt;&lt;span&gt;■ 당첨자발표&lt;/span&gt;&lt;span&gt;: 2027.01.29.(금) 예정&lt;/span&gt;&lt;/p&gt;',
].join('&#xD;\n');

describe('parseShNotice', () => {
  it('실공고 본문에서 접수기간·발표일·공급호수 추출', () => {
    expect(parseShNotice(BODY)).toEqual({
      applyBeginOn: '2026-09-09',
      applyEndOn: '2026-09-11',
      winnerAnnounceOn: '2027-01-29',
      supplyCount: 1484,
    });
  });

  it('매입임대는 접수 머리말이 청약신청이다', () => {
    const r = parseShNotice('□ 공급일정 ○ 청약신청 : 2026. 9. 28.(월) 10:00 ~ 2026. 9. 30.(수) 17:00');
    expect(r.applyBeginOn).toBe('2026-09-28');
    expect(r.applyEndOn).toBe('2026-09-30');
  });

  it('연도 넘어가는 접수기간', () => {
    const r = parseShNotice('신청접수: 2026. 12. 30. ~ 2027. 1. 2.');
    expect(r.applyBeginOn).toBe('2026-12-30');
    expect(r.applyEndOn).toBe('2027-01-02');
  });

  it('못 찾으면 null', () => {
    expect(parseShNotice('안내문입니다')).toEqual({ applyBeginOn: null, applyEndOn: null, winnerAnnounceOn: null, supplyCount: null });
  });
});

describe('parseShAttachments', () => {
  const html = `<script>
    initParam = {"allowExt":["PDF"],"downList":"","callBackFunction":"FSubmit()"};
    initParam.downList = [{"brdId":"GS0401","seq":"309337","fileSeq":"1","fileSize":"1935716","oriFileNm":"2026년 2차 행복주택 공고문(2026_08_28_ 공고).pdf","fileTp":"A"},{"brdId":"GS0401","seq":"309337","fileSeq":"2","fileSize":"87295","oriFileNm":"위임장(행복주택).pdf","fileTp":"A"}];
    initInnorix();
  </script>`;

  it('downList를 innoFD.do 다운로드 URL로 변환한다', () => {
    const files = parseShAttachments(html);
    expect(files).toHaveLength(2);
    expect(files[0].url).toBe('https://www.i-sh.co.kr/main/com/file/innoFD.do?brdId=GS0401&seq=309337&fileTp=A&fileSeq=1');
  });

  it('공고문 PDF를 위임장보다 우선 고른다', () => {
    expect(pickShNoticePdf(parseShAttachments(html).reverse())?.fileSeq).toBe('1');
  });

  it('downList가 없으면 빈 배열', () => {
    expect(parseShAttachments('<html></html>')).toEqual([]);
  });
});

describe('parseShList', () => {
  // 목록 실물 축약: 검색 폼 <tr>이 글 <tr>보다 먼저 나온다
  const html = `
    <tr><th scope="row">검색어</th><td><input name="srchWord"/></td></tr>
    <tr>
      <td>5137</td>
      <td class="txtL"><a href="#" onclick="javascript:getDetailView('309717');return false;"><span class="icoNew">NEW</span>
        [토지지원 사회주택]유니버설디자인하우스_창동 입주자 모집 공고</a></td>
      <td>공공개발금융부</td><td class="num">2026-09-03</td><td class="num">8598</td>
    </tr>
    <tr>
      <td>5120</td>
      <td class="txtL"><a href="#" onclick="javascript:getDetailView('309337');return false;">2026년 2차 행복주택 입주자 모집공고 (2026. 8. 28. 공고)</a></td>
      <td>공공주택공급부</td><td class="num">2026-08-28</td><td class="num">95417</td>
    </tr>`;

  it('글 행만 골라 글번호·seq·제목·등록일을 뽑는다 (NEW 배지 제거)', () => {
    expect(parseShList(html)).toEqual([
      { no: 5137, seq: '309717', title: '[토지지원 사회주택]유니버설디자인하우스_창동 입주자 모집 공고', postedOn: '2026-09-03' },
      { no: 5120, seq: '309337', title: '2026년 2차 행복주택 입주자 모집공고 (2026. 8. 28. 공고)', postedOn: '2026-08-28' },
    ]);
  });

  it('마지막 페이지는 맨끝 버튼에서 읽는다', () => {
    expect(parseShLastPage(`<a href="#none" onclick="getPaging(6,null);return false" class="btnNext">다음</a>
      <a href="#none" onclick="getPaging(514,null);return false" class="btnLast">맨끝</a>`)).toBe(514);
    expect(parseShLastPage('<div class="pagingWrap"><strong>1</strong></div>')).toBe(1);
  });
});

describe('shDetailBody', () => {
  it('이전글/다음글 표는 잘라낸다 — 다른 공고 날짜가 일정으로 섞이면 안 된다', () => {
    const body = shDetailBody('<div class="detailTable"><td>인터넷 접수 : 2026. 9. 9.(수) ~ 9. 11.(금)</td></div><caption>이전글/다음글</caption><span>2026-08-28</span>');
    expect(body).not.toContain('이전글');
    expect(parseShNotice(body).applyBeginOn).toBe('2026-09-09');
  });

  it('본문 표가 없는 페이지는 빈 문자열 — 좌우 메뉴 날짜를 일정으로 읽으면 안 된다', () => {
    expect(shDetailBody('<html><nav>2026-08-28</nav></html>')).toBe('');
  });
});

describe('shSupplyType', () => {
  it('모집공고만 유형을 매긴다', () => {
    expect(shSupplyType('2026년 2차 행복주택 입주자 모집공고 (2026. 8. 28. 공고)')).toBe('행복주택');
    expect(shSupplyType('2026년 2차 장기미임대 매입임대주택 입주자모집공고(2026. 8. 28.)')).toBe('매입임대');
    expect(shSupplyType('제51차 장기전세주택 입주자 모집공고(2026.08.31.공고)')).toBe('장기전세');
  });

  it('당첨자·서류심사 발표문은 유형 없음 — 모집 중 목록에 섞이면 안 된다', () => {
    expect(shSupplyType('[당첨자발표] 2026년 다자녀 매입임대주택 입주자모집공고(2026. 5. 29.) 당첨자 및 예비자 발표')).toBeNull();
    expect(shSupplyType('2026년 1차 청년 매입임대주택 입주자 모집공고(2026. 6. 26.) 서류심사대상자 발표')).toBeNull();
    expect(shSupplyType('고덕강일지구 용지 분양 공고')).toBeNull();
  });
});
