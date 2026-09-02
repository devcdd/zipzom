import type { Notice } from '@/entities/notice';
import { request } from '@/shared/api';

export const bookmarkApi = {
  ids: () => request<{ noticeIds: number[] }>('/bookmarks'),
  notices: () => request<{ total: number; items: Notice[] }>('/bookmarks/notices'),
  add: (noticeId: number) => request<{ ok: boolean }>(`/bookmarks/${noticeId}`, { method: 'PUT' }),
  remove: (noticeId: number) => request<{ ok: boolean }>(`/bookmarks/${noticeId}`, { method: 'DELETE' }),
};
