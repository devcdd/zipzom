import { useEffect, useState } from 'react';
import { AdminPage } from '@/pages/admin';
import { HomePage } from '@/pages/home';
import { ProfilePage } from '@/pages/profile';
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
  const Page = path.startsWith('/admin') ? AdminPage : path.startsWith('/profile') ? ProfilePage : HomePage;
  return (
    <div className="flex min-h-svh flex-col">
      <Header path={path} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6">
        <Page key={path} />
      </main>
    </div>
  );
}
