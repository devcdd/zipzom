import { describe, expect, it } from 'vitest';
import { lhDate, parseArea, parseLhParams, pickLhNoticePdf } from './lh.client.js';

describe('lh.client', () => {
  it('청약플러스 상세 링크에서 상세 API 파라미터를 뽑는다', () => {
    expect(parseLhParams('https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancInfo.do?panId=2015122300020647&ccrCnntSysDsCd=03&uppAisTpCd=06&aisTpCd=10&mi=1026')).toEqual({
      panId: '2015122300020647',
      ccrCnntSysDsCd: '03',
      uppAisTpCd: '06',
      aisTpCd: '10',
    });
    expect(parseLhParams('https://www.myhome.go.kr/x?pblancId=1')).toBeNull();
    expect(parseLhParams(null)).toBeNull();
  });

  it('LH 날짜 표기 변환', () => {
    expect(lhDate('2026.08.31')).toBe('2026-08-31');
    expect(lhDate('')).toBeNull();
    expect(lhDate(undefined)).toBeNull();
  });

  it('공고문(PDF) 파일구분을 우선 고른다', () => {
    const files = [
      { kind: '공고문(hwp)', name: 'a.hwpx', url: 'u1' },
      { kind: '공고문(PDF)', name: 'a.pdf', url: 'u2' },
    ];
    expect(pickLhNoticePdf(files)?.url).toBe('u2');
    expect(pickLhNoticePdf([files[0]])).toBeUndefined();
  });

  it('전용면적 표기를 ㎡ 범위로 읽는다', () => {
    expect(parseArea('26.95~44.68')).toEqual({ min: 26.95, max: 44.68 });
    expect(parseArea('36.78')).toEqual({ min: 36.78, max: 36.78 });
    expect(parseArea('')).toBeNull();
    expect(parseArea(undefined)).toBeNull();
  });
});
