import { request } from '@/shared/api';
import type { Profile } from '@/entities/profile';
import type { MatchResult } from '../model/types';

export const matchApi = {
  /** 프로필을 본문으로 보내 판정. 로그인 시 서버가 매칭 이력(NEW 배지)도 기록 */
  evaluate: (profile: Profile) => request<MatchResult>('/matches', { method: 'POST', body: JSON.stringify(profile) }),
};
