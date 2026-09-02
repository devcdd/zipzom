import { request } from '@/shared/api';
import type { Profile } from '../model/types';

/** localOnly면 서버엔 생년월일만 있고 나머지 조건은 브라우저에 있다 */
export interface ProfileState {
  localOnly: boolean;
  birthDate: string | null;
  profile: Profile | null;
}

export const profileApi = {
  getMe: () => request<ProfileState>('/profiles/me'),
  saveMe: (p: Profile) => request<ProfileState>('/profiles/me', { method: 'PUT', body: JSON.stringify(p) }),
  saveLocalOnly: (birthDate: string) => request<ProfileState>('/profiles/me', { method: 'PUT', body: JSON.stringify({ localOnly: true, birthDate }) }),
};
