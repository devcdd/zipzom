import { useState } from 'react';
import type { Evaluation } from '@/entities/match';

/** 공급유형·계층별 자격 판정. 칩을 누르면 항목별 근거. */
export function EligibilitySummary({ evaluations }: { evaluations: Evaluation[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const passed = evaluations.filter((e) => e.ok);
  const detail = evaluations.find((e) => e.code === open);

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {passed.length > 0 ? (
            <>
              <span className="text-brand">{passed.map((e) => e.label).join(' · ')}</span> 자격으로 지원 가능
            </>
          ) : (
            '현재 조건으로 지원 가능한 공고가 없어요'
          )}
        </h2>
        <a href="#/profile" className="text-xs text-brand hover:underline">
          조건 수정
        </a>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {evaluations.map((e) => (
          <button
            key={e.code}
            type="button"
            aria-pressed={open === e.code}
            onClick={() => setOpen(open === e.code ? null : e.code)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              e.ok ? 'border-brand/40 bg-brand-soft text-brand' : 'border-line bg-surface text-muted line-through decoration-line/80'
            } ${open === e.code ? 'ring-2 ring-brand/30' : ''}`}
          >
            {e.label}
          </button>
        ))}
      </div>
      {detail && (
        <ul className="mt-3 grid gap-1 text-[13px] sm:grid-cols-2">
          {detail.checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2">
              <span className={`mt-0.5 font-mono text-xs ${c.ok ? 'text-brand' : 'text-danger'}`}>{c.ok ? '✓' : '✗'}</span>
              <span>
                <span className="font-medium">{c.label}</span> <span className="text-muted">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted">공고별 우선공급·거주 요건은 반영되지 않아요. 최종 자격은 원문 공고문으로 확인하세요.</p>
    </section>
  );
}
