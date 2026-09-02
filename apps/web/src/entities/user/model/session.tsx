import type { ReactNode } from 'react';
import { Ctx } from './sessionContext';
import { useMe } from './useMe';

/** 앱 루트에서 한 번만 /auth/me 를 부르고 헤더·페이지가 공유 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useMe();
  return <Ctx.Provider value={session}>{children}</Ctx.Provider>;
}
