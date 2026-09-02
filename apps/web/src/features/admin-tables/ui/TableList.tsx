import type { TableInfo } from '../api/adminApi';

export function TableList({ tables, selected, onSelect }: { tables: TableInfo[]; selected: string | null; onSelect: (name: string) => void }) {
  return (
    <ul className="card divide-y divide-line overflow-hidden text-sm">
      {tables.map((t) => (
        <li key={t.name}>
          <button
            type="button"
            onClick={() => onSelect(t.name)}
            className={`flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left font-mono text-[13px] transition-colors ${selected === t.name ? 'bg-brand-soft text-brand' : 'hover:bg-surface-2'}`}
          >
            <span className="truncate">{t.name}</span>
            <span className={`text-xs ${selected === t.name ? 'text-brand' : 'text-muted'}`}>{t.rows.toLocaleString('ko-KR')}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
