import { createContext, useContext } from 'react';
import type { useMe } from './useMe';

type Session = ReturnType<typeof useMe>;
export const Ctx = createContext<Session>({ me: undefined, loading: true, reload: () => {} });
export const useSession = () => useContext(Ctx);
