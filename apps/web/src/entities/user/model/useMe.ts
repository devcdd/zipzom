import { useAsync } from '@/shared/lib';
import { authApi, type Me } from '../api/authApi';

/** 현재 로그인 사용자. 세션 쿠키는 서버가 판단하니 요청 한 번이면 끝 */
export function useMe(): { me: Me | null | undefined; loading: boolean; reload: () => void } {
  const { data, loading, reload } = useAsync(() => authApi.me().catch(() => null), []);
  return { me: data, loading, reload };
}
