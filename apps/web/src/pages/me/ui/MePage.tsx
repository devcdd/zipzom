import { useEffect, useState } from 'react';
import { authApi, useSession } from '@/entities/user';
import { AccountSection } from './AccountSection';
import { BookmarksSection } from './BookmarksSection';

const TABS = [
  { key: 'account', label: '계정', hash: '#/me' },
  { key: 'bookmarks', label: '북마크', hash: '#/me/bookmarks' },
] as const;

/** 해시의 /me 뒷부분으로 탭 결정. #/me/bookmarks → bookmarks, 그 외 → account */
function useMeTab() {
  const [tab, setTab] = useState(() => (location.hash.slice(1).startsWith('/me/bookmarks') ? 'bookmarks' : 'account'));
  useEffect(() => {
    const on = () => setTab(location.hash.slice(1).startsWith('/me/bookmarks') ? 'bookmarks' : 'account');
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return tab;
}

export function MePage() {
  const { me, loading, reload } = useSession();
  const tab = useMeTab();

  if (loading) return null;
  if (!me)
    return (
      <div className="card mx-auto max-w-md p-10 text-center text-sm text-muted">
        <a href={authApi.loginUrl} className="text-brand hover:underline">
          카카오 로그인
        </a>{' '}
        후 이용할 수 있어요.
      </div>
    );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">마이페이지</h1>
        <p className="text-xs text-muted">{me.email}</p>
      </div>
      <nav className="flex gap-1 border-b border-line text-sm">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={t.hash}
            className={`-mb-px border-b-2 px-3 py-2 transition-colors ${tab === t.key ? 'border-brand font-medium text-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t.label}
          </a>
        ))}
      </nav>
      {tab === 'account' ? <AccountSection nickname={me.nickname ?? ''} onSaved={reload} /> : <BookmarksSection />}
    </div>
  );
}
