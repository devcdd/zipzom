import { useEffect, useState } from 'react';
import { AdminPage } from '@/pages/admin';
import { HomePage } from '@/pages/home';
import { MePage } from '@/pages/me';
import { ProfilePage } from '@/pages/profile';
import { SessionProvider } from '@/entities/user';
import { BottomNav } from '@/widgets/bottom-nav';
import { Header } from '@/widgets/header';

// ponytail: 해시 라우터 3개 경로. 중첩·파라미터 라우트 생기면 react-router
function useHashPath() {
  const [path, setPath] = useState(() => location.hash.slice(1) || '/');
  useEffect(() => {
    const onChange = () => setPath(location.hash.slice(1) || '/');
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

export function App() {
  const path = useHashPath();
  const Page = path.startsWith('/admin') ? AdminPage : path.startsWith('/profile') ? ProfilePage : path.startsWith('/me') ? MePage : HomePage;
  return (
    <SessionProvider>
      <div className="flex min-h-svh flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-5 py-6">
          <Page key={path.startsWith('/me') ? '/me' : path} />
        </main>
        <BottomNav path={path} />
      </div>
    </SessionProvider>
  );
}
