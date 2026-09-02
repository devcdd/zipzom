import { parseShAttachments, parseShNotice, pickShNoticePdf } from './sh-rss.client.js';

// 2026년 2차 행복주택 공고(seq 309337) 본문 실물 축약. RSS라 태그가 엔티티로 이스케이프됨
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
