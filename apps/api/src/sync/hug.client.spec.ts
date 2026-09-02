import { groupHugNotices, type HugJeonseRow } from './hug.client.js';

const row = (o: Partial<HugJeonseRow>): HugJeonseRow => ({ 모집공고일자: '20260724', ...o });

describe('groupHugNotices', () => {
  it('공고일자로 묶고 시군구별로 호수를 세며 최저 보증금을 고른다', () => {
    const [n] = groupHugNotices([
      row({ 지역구분명: '서울', 지역상세구분코드명: '강남구', '임대보증금액(원)': '380000000', 청약접수시작일자: '20260724', 청약접수종료일자: '20260807', 당첨예정발표일자: '20260828' }),
      row({ 지역구분명: '서울', 지역상세구분코드명: '강남구', '임대보증금액(원)': '250000000' }),
      row({ 지역구분명: '인천', 지역상세구분코드명: '남동구', '임대보증금액(원)': '150000000' }),
    ]);

    expect(n!.postedOn).toBe('2026-07-24');
    expect(n!.applyBeginOn).toBe('2026-07-24');
    expect(n!.applyEndOn).toBe('2026-08-07');
    expect(n!.winnerAnnounceOn).toBe('2026-08-28');
    expect(n!.title).toBe('HUG 든든전세주택 입주자 모집 공고 [2026.7.24]');
    expect(n!.areas).toEqual([
      { key: '서울 강남구', address: '서울 강남구', supplyCount: 2, minDeposit: 250_000_000, areaMin: null, areaMax: null },
      { key: '인천 남동구', address: '인천 남동구', supplyCount: 1, minDeposit: 150_000_000, areaMin: null, areaMax: null },
    ]);
  });

  it('공고일자가 다르면 별개 공고로 나뉜다', () => {
    const got = groupHugNotices([
      row({ 지역구분명: '서울', 지역상세구분코드명: '강남구' }),
      row({ 모집공고일자: '20260529', 지역구분명: '부산', 지역상세구분코드명: '해운대구' }),
    ]);
    expect(got.map((n) => n.postedOn)).toEqual(['2026-07-24', '2026-05-29']);
  });

  it('지역이 비면 areas에서 빠진다', () => {
    const [n] = groupHugNotices([row({ 지역구분명: '', 지역상세구분코드명: '' })]);
    expect(n!.areas).toEqual([]);
  });
});
