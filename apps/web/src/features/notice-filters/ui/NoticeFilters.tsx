import type { Region } from '@/entities/region';
import { PHASE_OPTIONS, type NoticeFilters as Filters } from '../model/types';
import { RegionPicker } from './RegionPicker';
import { SupplyTypePicker } from './SupplyTypePicker';

export function NoticeFilters({ value, onChange, regions = [] }: { value: Filters; onChange: (f: Filters) => void; regions?: Region[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" className="flex max-w-full overflow-x-auto rounded-md border border-line bg-surface p-0.5 text-sm">
        {PHASE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value.phase === o.value}
            onClick={() => onChange({ ...value, phase: o.value })}
            className={`shrink-0 whitespace-nowrap rounded px-3 py-1 transition-colors ${value.phase === o.value ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <RegionPicker value={value.regions} onChange={(regions) => onChange({ ...value, regions })} regions={regions} />
      <SupplyTypePicker value={value.supplyTypes} onChange={(supplyTypes) => onChange({ ...value, supplyTypes })} />
      {/* .field는 w-full이라 폭은 감싸는 div로 준다 */}
      <div className="min-w-40 flex-1 sm:w-56 sm:flex-none">
        <input
          type="search"
          className="field"
          placeholder="공고명·단지명 검색"
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
        />
      </div>
    </div>
  );
}
