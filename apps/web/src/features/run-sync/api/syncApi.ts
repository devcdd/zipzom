import { request } from '@/shared/api';

export interface SyncReport {
  myhome: { fetched: number; notices: number; error?: string };
  sh: { fetched: number; notices: number; error?: string };
  hug: { fetched: number; notices: number; error?: string };
  geocode: { attempted: number; resolved: number; error?: string };
}

export const syncApi = {
  run: () => request<SyncReport>('/admin/sync', { method: 'POST' }),
};
