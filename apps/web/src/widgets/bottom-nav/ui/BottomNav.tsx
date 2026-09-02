import { useSession } from '@/entities/user';

interface Item {
  href: string;
  label: string;
  match: (p: string) => boolean;
  icon: (active: boolean) => React.ReactNode;
}

const BASE: Item[] = [
  { href: '#/', label: '공고', match: (p) => p === '/', icon: HomeIcon },
  { href: '#/profile', label: '내 조건', match: (p) => p.startsWith('/profile'), icon: SlidersIcon },
  { href: '#/me', label: '마이', match: (p) => p.startsWith('/me'), icon: UserIcon },
];

/** 하단 고정 앱바. 상단 헤더 네비를 대체. 어드민은 로그인 어드민에게만 노출 */
export function BottomNav({ path }: { path: string }) {
  const { me } = useSession();
  const items = me?.isAdmin ? [...BASE, { href: '#/admin', label: '어드민', match: (p: string) => p.startsWith('/admin'), icon: GridIcon }] : BASE;

  return (
    <nav className="sticky bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl">
        {items.map((it) => {
          const active = it.match(path);
          return (
            <a
              key={it.href}
              href={it.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${active ? 'text-brand' : 'text-muted hover:text-ink'}`}
            >
              {it.icon(active)}
              {it.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function SlidersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="8" cy="16" r="2" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  );
}
