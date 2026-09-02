import { request } from '@/shared/api';
import type { MatchResult } from '../model/types';

export const matchApi = {
  get: (userId: string) => request<MatchResult>(`/matches/${userId}`),
};
