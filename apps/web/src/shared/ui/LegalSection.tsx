import type { ReactNode } from 'react';

/** 약관·방침 페이지의 조항 한 덩어리. 제목 + 본문. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}
