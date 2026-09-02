// ponytail: 로그인 없음. 프로필 저장 시 받은 userId를 브라우저에 보관. 인증 붙이면 토큰으로 교체
const KEY = 'zipzom.userId';

export const getUserId = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setUserId = (id: string) => {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* 사생활 보호 모드 등: 세션 동안만 유지 */
  }
};
