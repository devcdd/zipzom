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

export const syncApi = {
  run: () => request<SyncReport>('/admin/sync', { method: 'POST' }),
};
