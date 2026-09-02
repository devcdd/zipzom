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
  source: 'MYHOME' | 'LH' | 'SH';
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
