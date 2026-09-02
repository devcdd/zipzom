import { useAsync } from '@/shared/lib';
import { profileApi } from '../api/profileApi';
import { clearLocalProfile, loadLocalProfile, saveLocalProfile } from './localProfile';
import { EMPTY_PROFILE, type Profile } from './types';

interface Loaded {
  profile: Profile | null;
  localOnly: boolean;
}

/**
 * 로그인 여부와 "서버 미저장" 설정에 따라 프로필 출처를 고른다.
 * - 비로그인: 브라우저.
 * - 로그인 + 서버 저장: 서버. 서버에 없고 브라우저에만 있으면 서버로 옮긴다.
 * - 로그인 + 서버 미저장(localOnly): 서버엔 생년월일만, 나머지는 브라우저.
 * loggedIn이 undefined면 아직 세션 확인 중.
 */
export function useProfile(loggedIn: boolean | undefined) {
  const state = useAsync(async (): Promise<Loaded> => {
    if (loggedIn === undefined) return { profile: null, localOnly: false };
    if (!loggedIn) return { profile: loadLocalProfile(), localOnly: false };
    const r = await profileApi.getMe();
    if (r.localOnly) {
      const local = loadLocalProfile();
      const birthDate = r.birthDate ?? local?.birthDate ?? '';
      return { profile: local ? { ...local, birthDate } : birthDate ? { ...EMPTY_PROFILE, birthDate } : null, localOnly: true };
    }
    if (r.profile) return { profile: r.profile, localOnly: false };
    const local = loadLocalProfile();
    if (!local) return { profile: null, localOnly: false };
    const migrated = await profileApi.saveMe(local);
    clearLocalProfile();
    return { profile: migrated.profile, localOnly: false };
  }, [loggedIn]);

  const save = async (p: Profile, localOnly: boolean) => {
    if (!loggedIn) saveLocalProfile(p);
    else if (localOnly) {
      await profileApi.saveLocalOnly(p.birthDate);
      saveLocalProfile(p);
    } else {
      await profileApi.saveMe(p);
      clearLocalProfile();
    }
    state.reload();
  };

  return {
    profile: state.data?.profile ?? null,
    localOnly: state.data?.localOnly ?? false,
    loading: loggedIn === undefined || state.loading,
    error: state.error,
    save,
  };
}
