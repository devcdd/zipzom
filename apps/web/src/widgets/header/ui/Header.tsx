const NAV = [
  { href: '#/', label: '공고', match: (p: string) => p === '/' },
  { href: '#/profile', label: '내 조건', match: (p: string) => p.startsWith('/profile') },
  { href: '#/admin', label: '어드민', match: (p: string) => p.startsWith('/admin') },
];

export function Header({ path }: { path: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-5">
        <a href="#/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block size-2.5 rounded-full bg-brand" />
          집좀
        </a>
        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={`rounded-md px-3 py-1.5 transition-colors ${n.match(path) ? 'bg-surface-2 font-medium text-ink' : 'text-muted hover:text-ink'}`}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
