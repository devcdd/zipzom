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
}
