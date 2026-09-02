import { useEffect, useState } from 'react';
import { authApi } from '@/entities/user';
import { bookmarkApi } from '../api/bookmarkApi';

const EMPTY = new Set<number>();

/**
 * 북마크 id 집합 + 토글. 낙관적 갱신, 실패하면 되돌린다.
 * 비로그인은 서버에 저장할 곳이 없어 토글 시 카카오 로그인으로 보낸다
 */
export function useBookmarks(loggedIn: boolean | undefined) {
  const [ids, setIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    bookmarkApi.ids().then((r) => alive && setIds(new Set(r.noticeIds)), () => {});
    return () => {
      alive = false;
    };
  }, [loggedIn]);

  const toggle = async (noticeId: number) => {
    if (!loggedIn) {
      location.href = authApi.loginUrl;
      return;
    }
    const was = ids.has(noticeId);
    setIds((prev) => {
      const next = new Set(prev);
      if (was) next.delete(noticeId);
      else next.add(noticeId);
      return next;
    });
    try {
      await (was ? bookmarkApi.remove(noticeId) : bookmarkApi.add(noticeId));
    } catch {
      setIds((prev) => {
        const next = new Set(prev);
        if (was) next.add(noticeId);
        else next.delete(noticeId);
        return next;
      });
    }
  };

  // 로그아웃 직후 이전 사용자 집합이 남지 않도록 렌더에서 걸러낸다
  return { ids: loggedIn ? ids : EMPTY, toggle };
}
