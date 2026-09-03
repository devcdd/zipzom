import { describe, expect, it } from 'vitest';
import { parseMyhomeAttachments, pickMyhomeNoticePdf } from './myhome.client.js';

describe('parseMyhomeAttachments', () => {
  const html = `<tr><th>공고문</th><td colspan="3">
      <a href="javascript:fnDownFile('1a02391bcca55', '1')" > 붙임2) 2026학년도 2학기 상시 입주생 모집 공고문.pdf</a>
      <a href="javascript:fnDownFile('1a02391bcca55', '2')">위임장.hwp</a>
    </td></tr>`;

  it('fnDownFile 링크에서 첨부 ID·순번·파일명을 뽑는다', () => {
    expect(parseMyhomeAttachments(html)).toEqual([
      { atchFileId: '1a02391bcca55', fileSn: '1', name: '붙임2) 2026학년도 2학기 상시 입주생 모집 공고문.pdf' },
      { atchFileId: '1a02391bcca55', fileSn: '2', name: '위임장.hwp' },
    ]);
  });

  it('공고문 PDF만 고른다', () => {
    expect(pickMyhomeNoticePdf(parseMyhomeAttachments(html))?.fileSn).toBe('1');
    expect(pickMyhomeNoticePdf([])).toBeUndefined();
  });
});
