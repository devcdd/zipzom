import { request } from '@/shared/api';

export interface HouseGroup {
  code: string;
  supplyCount: number | null;
}

export interface ExtractedHouse {
  name: string;
  address: string | null;
  supplyCount: number | null;
  totalHouseholds: number | null;
  minDeposit: number | null;
  minMonthlyRent: number | null;
  groups: HouseGroup[];
}

export interface ExtractedEligibility {
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

export interface Extraction {
  noticeId: number;
  source: 'MYHOME' | 'LH' | 'SH' | 'HUG';
  title: string;
  detailUrl: string | null;
  pdfUrl: string;
  pdfName: string | null;
  model: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';
  houses: ExtractedHouse[] | null;
  eligibility: ExtractedEligibility[] | null;
  error: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

const post = (noticeId: number, action: 'approve' | 'reject' | 'retry', body?: object) =>
  request<unknown>(`/admin/extractions/${noticeId}/${action}`, { method: 'POST', body: body && JSON.stringify(body) });

export const extractionApi = {
  list: () => request<Extraction[]>('/admin/extractions'),
  approve: (noticeId: number, houses: ExtractedHouse[], eligibility: ExtractedEligibility[]) => post(noticeId, 'approve', { houses, eligibility }),
  reject: (noticeId: number) => post(noticeId, 'reject'),
  retry: (noticeId: number) => post(noticeId, 'retry'),
};
