/** 수집 대상 공급유형. 행복주택은 LH·SH·마이홈, 든든전세는 HUG. */
export const SUPPLY_TYPES = ['행복주택', '든든전세'];

export type Phase = 'upcoming' | 'open' | 'closed';

export interface House {
  id: number;
  houseSn: string | null;
  name: string | null;
  address: string | null;
  sidoCode: string | null;
  sigunguCode: string | null;
  totalHouseholds: number | null;
  supplyCount: number | null;
  minDeposit: number | null;
  minMonthlyRent: number | null;
  lat: number | null;
  lng: number | null;
  eligibleGroups: string[] | null; // 이 단지에 배정된 계층 코드. null = 미상
  areaMin: number | null; // 전용면적 ㎡
  areaMax: number | null;
}

/** 공고문에서 뽑은 공고별 자격 기준 (계층 단위). 없으면 공통 규칙 */
export interface NoticeEligibility {
  code: string;
  label: string;
  ageMin: number | null;
  ageMax: number | null;
  incomePct: number | null;
  dualIncomePct: number | null;
  assetLimit: number | null;
  carLimit: number | null;
  exempt: string[]; // 공고가 명시적으로 배제한 요건: income·asset·car
  conditions: string[];
}

export interface Notice {
  id: number;
  source: 'MYHOME' | 'LH' | 'SH' | 'HUG';
  sourceId: string;
  title: string;
  institution: string | null;
  houseType: string | null;
  supplyType: string | null;
  status: string | null;
  postedOn: string | null;
  applyBeginOn: string | null;
  applyEndOn: string | null;
  winnerAnnounceOn: string | null;
  detailUrl: string | null;
  contact: string | null;
  phase: Phase;
  houses: House[];
  eligibility: NoticeEligibility[];
}
