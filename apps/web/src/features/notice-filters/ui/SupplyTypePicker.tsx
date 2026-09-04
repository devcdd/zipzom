import { useRef } from 'react';
import { noticeApi, type SupplyTypeCount } from '@/entities/notice';
import { useAsync } from '@/shared/lib';

const summary = (value: string[]) => (value.length === 0 ? '전체 유형' : value.length === 1 ? value[0] : `${value[0]} 외 ${value.length - 1}`);

/**
  * 공급유형 다중 선택. 선택지는 기본적으로 수집된 값 전체(/notices/supply-types).
  * options를 주면 그것만 쓴다 — 내 매칭처럼 결과에 있는 유형만 보여야 하는 화면용
  */
export function SupplyTypePicker({ value, options, onChange }: { value: string[]; options?: SupplyTypeCount[]; onChange: (types: string[]) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const fetched = useAsync(() => (options ? Promise.resolve(options) : noticeApi.supplyTypes()), [options]);
  const types = options ?? fetched.data ?? [];
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);

  return (
    <>
      <button type="button" className="btn-ghost" aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        {summary(value)}
        <span aria-hidden className="text-muted">▾</span>
      </button>
      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && ref.current.close()}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-sm font-semibold">공급유형 선택</span>
          <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => onChange([])}>
            선택 해제
          </button>
        </div>
        <div className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto p-4 text-sm">
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" checked={value.length === 0} onChange={() => onChange([])} />
            전체 유형
          </label>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pl-6 sm:grid-cols-3">
            {types.map((t) => (
              <label key={t.supplyType} className="flex items-center gap-2 text-muted has-checked:text-ink">
                <input type="checkbox" checked={value.includes(t.supplyType)} onChange={() => toggle(t.supplyType)} />
                <span className="truncate">{t.supplyType}</span>
                <span className="text-xs opacity-60">{t.count}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end border-t border-line px-4 py-3">
          <button type="button" className="btn-primary" onClick={() => ref.current?.close()}>
            확인
          </button>
        </div>
      </dialog>
    </>
  );
}
