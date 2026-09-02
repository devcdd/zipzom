import { request } from '@/shared/api';

export interface SyncReport {
  myhome: { fetched: number; notices: number; error?: string };
  sh: { fetched: number; notices: number; error?: string };
  lhArea: { updated: number; error?: string };
  lhExtract: { attempted: number; error?: string };
  hug: { fetched: number; notices: number; error?: string };
  lh: { fetched: number; notices: number; error?: string };
  merge: { linked: number };
  geocode: { attempted: number; resolved: number; error?: string };
}

export interface SyncRun {
  source: string;
  startedAt: string;
  finishedAt: string | null;
  fetched: number | null;
  upserted: number | null;
  error: string | null;
}

export const syncApi = {
  run: () => request<SyncReport>('/admin/sync', { method: 'POST' }),
  last: () => request<SyncRun[]>('/admin/sync/last'),
};
