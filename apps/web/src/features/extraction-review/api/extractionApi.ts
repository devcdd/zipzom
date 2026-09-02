import { request } from '@/shared/api';

export interface ExtractedHouse {
  name: string;
  address: string | null;
  supplyCount: number | null;
  totalHouseholds: number | null;
  minDeposit: number | null;
  minMonthlyRent: number | null;
}

export interface Extraction {
  noticeId: number;
  title: string;
  detailUrl: string | null;
  pdfUrl: string;
  pdfName: string | null;
  model: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';
  houses: ExtractedHouse[] | null;
  error: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

const post = (noticeId: number, action: 'approve' | 'reject' | 'retry', body?: object) =>
  request<unknown>(`/admin/extractions/${noticeId}/${action}`, { method: 'POST', body: body && JSON.stringify(body) });

export const extractionApi = {
  list: () => request<Extraction[]>('/admin/extractions'),
  approve: (noticeId: number, houses: ExtractedHouse[]) => post(noticeId, 'approve', { houses }),
  reject: (noticeId: number) => post(noticeId, 'reject'),
  retry: (noticeId: number) => post(noticeId, 'retry'),
};
