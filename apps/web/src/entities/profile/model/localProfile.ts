import type { Profile } from './types';

// 비로그인 프로필은 서버로 가지 않는다. 로그인하면 서버로 옮기고 지운다
const KEY = 'zipzom.profile';

export const loadLocalProfile = (): Profile | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
};

export const saveLocalProfile = (p: Profile) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* 사생활 보호 모드 등: 세션 동안만 유지 */
  }
};

export const clearLocalProfile = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
};
