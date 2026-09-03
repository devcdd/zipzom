import { qs, request } from '@/shared/api';

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
  areaMin: number | null;
  areaMax: number | null;
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

/** 추출 후보 공고. extractionStatus가 null이면 아직 한 번도 안 돌린 공고 */
export interface ExtractTarget {
  id: number;
  source: Extraction['source'];
  title: string;
  supplyType: string | null;
  postedOn: string | null;
  applyEndOn: string | null;
  detailUrl: string | null;
  extractionStatus: Extraction['status'] | null;
}

export interface ExtractQueue {
  running: boolean;
  current: number | null;
  queued: number;
}

const post = (noticeId: number, action: 'approve' | 'reject' | 'retry', body?: object) =>
  request<unknown>(`/admin/extractions/${noticeId}/${action}`, { method: 'POST', body: body && JSON.stringify(body) });

export const extractionApi = {
  list: (q: { status?: Extraction['status']; limit: number; offset: number }) =>
    request<{ total: number; items: Extraction[] }>(`/admin/extractions?${qs({ status: q.status, limit: String(q.limit), offset: String(q.offset) })}`),
  approve: (noticeId: number, houses: ExtractedHouse[], eligibility: ExtractedEligibility[]) => post(noticeId, 'approve', { houses, eligibility }),
  reject: (noticeId: number) => post(noticeId, 'reject'),
  retry: (noticeId: number) => post(noticeId, 'retry'),
  targets: (q: { source?: Extraction['source']; q?: string; onlyMissing?: boolean; limit: number; offset: number }) =>
    request<{ total: number; items: ExtractTarget[] }>(
      `/admin/extract-targets?${qs({ source: q.source, q: q.q, onlyMissing: q.onlyMissing ? 'true' : undefined, limit: String(q.limit), offset: String(q.offset) })}`,
    ),
  run: (noticeIds: number[]) => request<{ added: number } & ExtractQueue>('/admin/extractions/run', { method: 'POST', body: JSON.stringify({ noticeIds }) }),
  queue: () => request<ExtractQueue>('/admin/extractions/queue'),
};
