import type { Region } from '@/entities/region';
import { PHASE_OPTIONS, type NoticeFilters as Filters } from '../model/types';
import { RegionPicker } from './RegionPicker';

export function NoticeFilters({ value, onChange, regions = [] }: { value: Filters; onChange: (f: Filters) => void; regions?: Region[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" className="inline-flex rounded-md border border-line bg-surface p-0.5 text-sm">
        {PHASE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value.phase === o.value}
            onClick={() => onChange({ ...value, phase: o.value })}
            className={`rounded px-3 py-1 transition-colors ${value.phase === o.value ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <RegionPicker value={value.regions} onChange={(regions) => onChange({ ...value, regions })} regions={regions} />
      <input
        type="search"
        className="field w-56"
        placeholder="공고명·단지명 검색"
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.target.value })}
      />
    </div>
  );
}
