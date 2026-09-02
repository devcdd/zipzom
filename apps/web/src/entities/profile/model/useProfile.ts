import { useAsync } from '@/shared/lib';
import { profileApi } from '../api/profileApi';
import { clearLocalProfile, loadLocalProfile, saveLocalProfile } from './localProfile';
import type { Profile } from './types';

/**
 * 로그인 여부에 따라 프로필 출처를 고른다.
 * 로그인 상태에서 서버에 없고 브라우저에만 있으면 서버로 옮긴다 (비로그인으로 입력하다 로그인한 경우).
 * loggedIn이 undefined면 아직 세션 확인 중.
 */
export function useProfile(loggedIn: boolean | undefined) {
  const state = useAsync(async (): Promise<Profile | null> => {
    if (loggedIn === undefined) return null;
    if (!loggedIn) return loadLocalProfile();
    const server = await profileApi.getMe();
    if (server) return server;
    const local = loadLocalProfile();
    if (!local) return null;
    const migrated = await profileApi.saveMe(local);
    clearLocalProfile();
    return migrated;
  }, [loggedIn]);

  const save = async (p: Profile) => {
    if (loggedIn) await profileApi.saveMe(p);
    else saveLocalProfile(p);
    state.reload();
  };

  return { profile: state.data ?? null, loading: loggedIn === undefined || state.loading, error: state.error, save };
}
