import { request } from '@/shared/api';

export interface Me {
  id: string;
  email: string;
  nickname: string | null;
  isAdmin: boolean;
}

// 비로그인은 { id: null }
type MeResponse = Me | { id: null };

export const authApi = {
  me: async (): Promise<Me | null> => {
    const r = await request<MeResponse>('/auth/me');
    return r.id ? r : null;
  },
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  /** 카카오 인가 페이지로 이동하는 서버 엔드포인트 (풀 리다이렉트) */
  loginUrl: '/api/auth/kakao',
};
