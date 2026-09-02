import { request } from '@/shared/api';
import type { Profile } from '../model/types';

export const profileApi = {
  /** 로그인 필수. 저장된 프로필 없으면 null */
  getMe: () => request<Profile | null>('/profiles/me'),
  saveMe: (p: Profile) => request<Profile>('/profiles/me', { method: 'PUT', body: JSON.stringify(p) }),
};
