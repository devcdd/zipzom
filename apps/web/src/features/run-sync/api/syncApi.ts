import { request } from '@/shared/api';

export interface SyncRun {
  source: string;
  startedAt: string;
  finishedAt: string | null;
  fetched: number | null;
  upserted: number | null;
  error: string | null;
}

export interface SyncStatus {
  running: boolean;
  startedAt: string | null; // 서버 기준 현재 실행 시작 시각
  runs: SyncRun[];
}

export const syncApi = {
  /** 즉시 반환. 서버가 백그라운드로 끝까지 돈다 */
  run: () => request<{ started: boolean; running: boolean }>('/admin/sync', { method: 'POST' }),
  status: () => request<SyncStatus>('/admin/sync/last'),
};
