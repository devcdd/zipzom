import { authApi, useSession } from '@/entities/user';

const NAV = [
  { href: '#/', label: '공고', match: (p: string) => p === '/' },
  { href: '#/profile', label: '내 조건', match: (p: string) => p.startsWith('/profile') },
];

export function Header({ path }: { path: string }) {
  const { me, loading, reload } = useSession();
  const nav = me?.isAdmin ? [...NAV, { href: '#/admin', label: '어드민', match: (p: string) => p.startsWith('/admin') }] : NAV;

  const logout = async () => {
    await authApi.logout();
    reload();
    if (path.startsWith('/admin')) location.hash = '#/';
  };

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-5">
        <a href="#/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block size-2.5 rounded-full bg-brand" />
          집좀
        </a>
        <nav className="flex items-center gap-1 text-sm">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={`rounded-md px-3 py-1.5 transition-colors ${n.match(path) ? 'bg-surface-2 font-medium text-ink' : 'text-muted hover:text-ink'}`}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          {loading ? null : me ? (
            <>
              <span className="max-w-40 truncate text-muted" title={me.email}>
                {me.nickname ?? me.email}
              </span>
              <button type="button" onClick={logout} className="btn-ghost px-2.5 py-1 text-xs">
                로그아웃
              </button>
            </>
          ) : (
            <a href={authApi.loginUrl} className="inline-flex items-center gap-1.5 rounded-md bg-[#FEE500] px-3 py-1.5 text-xs font-medium text-[#191919] hover:brightness-95">
              <KakaoIcon />
              카카오 로그인
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

function KakaoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#191919" aria-hidden="true">
      <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.2 4.6 6.6L5.5 21l4.4-2.6c.7.1 1.4.2 2.1.2 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
    </svg>
  );
}
