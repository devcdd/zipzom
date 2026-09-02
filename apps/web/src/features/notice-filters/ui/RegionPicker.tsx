import { useRef } from 'react';
import { groupBySido, isSidoCode, mergeSidos, regionLabel, type Region } from '@/entities/region';

const summary = (selected: string[], regions: Region[]) => {
  if (selected.length === 0) return '전체 지역';
  const sidos = selected.filter(isSidoCode);
  const first = regions.find((r) => r.code === (sidos[0] ?? selected[0]));
  const shown = sidos.length > 0 ? sidos.length : selected.length;
  const label = first ? regionLabel(first) : selected[0];
  return shown > 1 ? `${label} 외 ${shown - 1}` : label;
};

export function RegionPicker({ value, onChange, regions }: { value: string[]; onChange: (codes: string[]) => void; regions: Region[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const groups = groupBySido(regions, mergeSidos(regions));
  // 시도 전체('XX000') 행은 groupBySido가 보충하므로 라벨 조회는 그룹 기준
  const all = groups.flatMap((g) => g.regions);
  const has = (code: string) => value.includes(code);

  const toggleSido = (codes: string[]) => {
    const [sido] = codes;
    onChange(has(sido) ? value.filter((c) => !codes.includes(c)) : [...new Set([...value, ...codes])]);
  };
  const toggleSigungu = (code: string, sido: string) => {
    // 시도 전체 선택 상태에서 구 하나를 빼면 시도 전체 해제, 나머지 구는 유지
    onChange(has(code) ? value.filter((c) => c !== code && c !== sido) : [...value, code]);
  };

  return (
    <>
      <button type="button" className="btn-ghost" aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        {summary(value, all)}
        <span aria-hidden className="text-muted">▾</span>
      </button>
      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && ref.current.close()}
        className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-sm font-semibold">지역 선택</span>
          <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => onChange([])}>
            선택 해제
          </button>
        </div>
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto p-4 text-sm">
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" checked={value.length === 0} onChange={() => onChange([])} />
            전체 지역
          </label>
          {groups.map((g) => {
            const codes = g.regions.map((r) => r.code);
            const [sidoRow, ...rest] = g.regions;
            return (
              <fieldset key={g.sido.code} className="flex flex-col gap-1.5">
                <legend className="mb-1.5 flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={has(sidoRow.code)} onChange={() => toggleSido(codes)} />
                  {regionLabel(sidoRow)} <span className="text-xs text-muted">{sidoRow.houseCount}</span>
                </legend>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pl-6 sm:grid-cols-3">
                  {rest.map((r) => (
                    <label key={r.code} className="flex items-center gap-2 text-muted has-checked:text-ink">
                      <input type="checkbox" checked={has(r.code)} onChange={() => toggleSigungu(r.code, sidoRow.code)} />
                      {regionLabel(r)} <span className="text-xs opacity-60">{r.houseCount}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
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
