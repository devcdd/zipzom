import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { TablePage } from '../api/adminApi';

const MIN_WIDTH = 60;

function defaultWidth(name: string, type: string): number {
  if (type.includes('json')) return 260;
  if (type.includes('timestamp') || type === 'date') return 150;
  if (type === 'uuid') return 140;
  if (['bigint', 'integer', 'smallint', 'numeric', 'double precision', 'boolean'].includes(type)) return 90;
  if (['title', 'name', 'address', 'url', 'error', 'contact'].some((k) => name.includes(k))) return 280;
  return 140;
}

function Cell({ value }: { value: unknown }) {
  if (value == null) return <span className="text-muted/60">∅</span>;
  if (typeof value === 'boolean') return <span className={value ? 'text-brand' : 'text-muted'}>{String(value)}</span>;
  if (typeof value === 'object') {
    const s = JSON.stringify(value);
    return (
      <span className="font-mono text-2xs text-muted" title={s}>
        {s}
      </span>
    );
  }
  const s = String(value);
  return <span title={s}>{s}</span>;
}

export function DataTable({ page, offset, limit, onPage }: { page: TablePage; offset: number; limit: number; onPage: (offset: number) => void }) {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(page.columns.map((c) => [c.name, defaultWidth(c.name, c.type)])),
  );
  const [resizing, setResizing] = useState(false);

  const startResize = (e: ReactPointerEvent, name: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widths[name] ?? MIN_WIDTH;
    setResizing(true);
    const onMove = (ev: PointerEvent) => setWidths((w) => ({ ...w, [name]: Math.max(MIN_WIDTH, startW + ev.clientX - startX) }));
    const onUp = () => {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', onUp);
      setResizing(false);
    };
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp);
  };

  const total = page.columns.reduce((sum, c) => sum + (widths[c.name] ?? MIN_WIDTH), 0);
  const from = page.total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, page.total);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className={`table-fixed text-sm ${resizing ? 'select-none' : ''}`} style={{ width: total, minWidth: '100%' }}>
          <colgroup>
            {page.columns.map((c) => (
              <col key={c.name} style={{ width: widths[c.name] }} />
            ))}
          </colgroup>
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              {page.columns.map((c) => (
                <th key={c.name} className="relative overflow-hidden px-3 py-2 font-medium">
                  <div className="truncate" title={`${c.name} · ${c.type}`}>
                    {c.name}
                    <span className="ml-1 font-mono text-2xs opacity-60">{c.type}</span>
                  </div>
                  {/* 드래그 리사이즈 핸들 */}
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    onPointerDown={(e) => startResize(e, c.name)}
                    className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize touch-none hover:bg-brand/40"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {page.rows.map((row, i) => (
              <tr key={i} className="hover:bg-surface-2/60">
                {page.columns.map((c) => (
                  <td key={c.name} className="overflow-hidden px-3 py-1.5 align-top">
                    <div className="truncate">
                      <Cell value={row[c.name]} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
            {page.rows.length === 0 && (
              <tr>
                <td colSpan={page.columns.length} className="px-3 py-8 text-center text-muted">
                  비어 있음
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-line px-3 py-2 text-xs text-muted">
        <span>
          {from}–{to} / {page.total.toLocaleString('ko-KR')}
        </span>
        <div className="flex gap-1">
          <button type="button" className="btn-ghost px-2.5 py-1" disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - limit))}>
            이전
          </button>
          <button type="button" className="btn-ghost px-2.5 py-1" disabled={to >= page.total} onClick={() => onPage(offset + limit)}>
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
