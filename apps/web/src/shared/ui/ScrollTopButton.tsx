import { useEffect, useState } from 'react';

/** 조금이라도 내려간 뒤에만 뜨는 맨 위로 버튼. 하단 앱바(sticky) 위에 앉도록 bottom 여백을 준다 */
export function ScrollTopButton({ showAfter = 400 }: { showAfter?: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(scrollY > showAfter);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, [showAfter]);

  if (!show) return null;
  return (
    <button
      type="button"
      aria-label="맨 위로"
      onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed right-4 bottom-20 z-30 flex size-11 items-center justify-center rounded-full border border-line bg-surface/95 text-muted shadow-lg backdrop-blur transition-colors hover:text-ink lg:bottom-6"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
