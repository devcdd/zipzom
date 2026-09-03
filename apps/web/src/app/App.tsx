import { useEffect, useState } from 'react';
import { AdminPage } from '@/pages/admin';
import { HomePage } from '@/pages/home';
import { MePage } from '@/pages/me';
import { PastPage } from '@/pages/past';
import { PrivacyPage } from '@/pages/privacy';
import { TermsPage } from '@/pages/terms';
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
  const Page = path.startsWith('/admin') ? AdminPage : path.startsWith('/profile') ? ProfilePage : path.startsWith('/me') ? MePage : path.startsWith('/past') ? PastPage : path.startsWith('/terms') ? TermsPage : path.startsWith('/privacy') ? PrivacyPage : HomePage;
  return (
    <SessionProvider>
      <div className="flex min-h-svh flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-5 py-6">
          <Page key={path.startsWith('/me') ? '/me' : path} />
        </main>
        <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-5 pb-4 pt-2 text-[11px] text-muted">
          <a href="#/privacy" className="hover:text-ink hover:underline">
            개인정보 처리방침
          </a>
          <span aria-hidden="true">·</span>
          <a href="#/terms" className="hover:text-ink hover:underline">
            위치정보 이용약관
          </a>
          <span aria-hidden="true">·</span>
          <span>
            Contact{' '}
            <a href="mailto:developer.cdd@gmail.com" className="hover:text-ink hover:underline">
              developer.cdd@gmail.com
            </a>
          </span>
        </footer>
        <BottomNav path={path} />
      </div>
    </SessionProvider>
  );
}
