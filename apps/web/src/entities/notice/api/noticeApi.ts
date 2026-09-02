import { qs, request } from '@/shared/api';
import type { Notice, Phase } from '../model/types';

export interface NoticeQuery {
  supplyTypes?: string[];
  phase?: Phase[];
  sigungu?: string[];
  sido?: string[];
  q?: string;
  limit?: number;
  offset?: number;
}

export const noticeApi = {
  list: (query: NoticeQuery) =>
    request<{ total: number; items: Notice[] }>(
      `/notices?${qs({
        supplyType: query.supplyTypes?.join(','),
        phase: query.phase?.join(','),
        sigungu: query.sigungu?.join(','),
        sido: query.sido?.join(','),
        q: query.q,
        limit: query.limit?.toString(),
        offset: query.offset?.toString(),
      })}`,
    ),
};
