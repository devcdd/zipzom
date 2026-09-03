import { mergeKey, planMerges, type DedupeRow } from './dedupe.js';

const row = (o: Partial<DedupeRow> & { id: number; title: string }): DedupeRow => ({
  source: 'LH', postedOn: '2026-08-18', houseCount: 0, ...o,
});

describe('mergeKey', () => {
  it('말머리 대괄호와 날짜 괄호를 떼면 같은 공고가 같은 키가 된다', () => {
    expect(mergeKey('[정정공고]서울번동3 행복주택 예비입주자 모집')).toBe(mergeKey('서울번동3 행복주택 예비입주자 모집'));
    expect(mergeKey("익산인화 행복주택 예비입주자 모집 공고('26.08.18)")).toBe(mergeKey('익산인화 행복주택 예비입주자 모집 공고'));
    expect(mergeKey('(2026.08.19.)완주삼봉 행복주택 모집')).toBe(mergeKey('완주삼봉 행복주택 모집'));
    // 마이홈은 곧은 따옴표, LH는 굽은 따옴표로 같은 날짜를 쓴다
    expect(mergeKey("부천영상 행복주택 모집공고('26.08.18)")).toBe(mergeKey('부천영상 행복주택 모집공고(‘26.08.18)'));
  });

  it('SH는 대괄호에 단지명을 넣는다 — 말머리가 아니면 남긴다', () => {
    expect(mergeKey('[세이지움 태릉입구역] 사용검사 확인증 게시')).not.toBe(mergeKey('[강동 헤리티지 자이] 사용검사 확인증 게시'));
    expect(mergeKey('[토지지원 사회주택]함께주택4호 401-1호 입주자 모집 공고')).not.toBe(mergeKey('[토지지원 사회주택]유니버설디자인하우스_창동 입주자 모집 공고'));
  });

  it('블록 번호 괄호는 남겨서 다른 공고가 붙지 않게 한다', () => {
    expect(mergeKey('완주삼봉(A-1,A-3BL) 행복주택 모집')).not.toBe(mergeKey('완주삼봉(B-2BL) 행복주택 모집'));
  });
});

describe('planMerges', () => {
  it('단지 정보가 많은 쪽을 대표로 남긴다', () => {
    const links = planMerges([
      row({ id: 1, source: 'MYHOME', title: '청주산단1,청주산단2 행복주택 예비입주자 모집', houseCount: 4 }),
      row({ id: 2, source: 'LH', title: '청주산단1, 청주산단2 행복주택 예비입주자 모집', houseCount: 1 }),
    ]);
    expect(links).toEqual([{ duplicateId: 2, canonicalId: 1 }]);
  });

  it('단지 수가 같으면 최신 공고일이 대표', () => {
    const links = planMerges([
      row({ id: 1, title: '서울번동3 행복주택 예비입주자 모집', postedOn: '2026-08-05' }),
      row({ id: 2, title: '[정정공고]서울번동3 행복주택 예비입주자 모집', postedOn: '2026-08-21' }),
    ]);
    expect(links).toEqual([{ duplicateId: 1, canonicalId: 2 }]);
  });

  it('겹치지 않는 공고는 병합하지 않는다', () => {
    expect(planMerges([row({ id: 1, title: '가' }), row({ id: 2, title: '나' })])).toEqual([]);
  });
});
