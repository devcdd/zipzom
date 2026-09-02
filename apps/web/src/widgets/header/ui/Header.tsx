import { authApi, useSession } from '@/entities/user';

/** 상단은 로고 + 비로그인 시 로그인 버튼만. 화면 이동은 하단 앱바가 맡는다 */
export function Header() {
  const { me, loading } = useSession();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-5">
        <a href="#/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block size-2.5 rounded-full bg-brand" />
          집좀
        </a>
        {!loading && !me && (
          <a href={authApi.loginUrl} className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-[#FEE500] px-3 py-1.5 text-xs font-medium text-[#191919] hover:brightness-95">
            <KakaoIcon />
            카카오 로그인
          </a>
        )}
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
