import { request } from '@/shared/api';
import type { Profile } from '../model/types';

export const profileApi = {
  get: (userId: string) => request<Profile>(`/profiles/${userId}`),
  create: (p: Profile) => request<{ userId: string }>('/profiles', { method: 'POST', body: JSON.stringify(p) }),
  update: (userId: string, p: Profile) => request<Profile>(`/profiles/${userId}`, { method: 'PUT', body: JSON.stringify(p) }),
};
