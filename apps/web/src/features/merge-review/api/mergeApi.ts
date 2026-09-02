import { request } from '@/shared/api';

/** 자동 병합된 중복 공고 쌍. duplicate 쪽이 목록에서 숨겨진 상태다. */
export interface MergePair {
  id: number;
  source: string;
  sourceId: string;
  title: string;
  postedOn: string | null;
  detailUrl: string | null;
  canonicalId: number;
  canonicalSource: string;
  canonicalTitle: string;
  canonicalPostedOn: string | null;
  canonicalDetailUrl: string | null;
  canonicalHouseCount: number;
}

export const mergeApi = {
  list: () => request<MergePair[]>('/admin/duplicates'),
  unlink: (id: number) => request<{ ok: true }>(`/admin/duplicates/${id}/unlink`, { method: 'POST' }),
};
