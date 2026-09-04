import { useState } from 'react';
import { adminApi, DataTable, TableList } from '@/features/admin-tables';
import { ExtractionReview, ExtractionTargets } from '@/features/extraction-review';
import { MergeReview } from '@/features/merge-review';
import { LastSync, SyncButton } from '@/features/run-sync';
import { useAsync } from '@/shared/lib';
import { PageState } from '@/shared/ui';

const LIMIT = 50;

type Tab = 'db' | 'targets' | 'review' | 'merge';

export function AdminBrowser() {
  const [tab, setTab] = useState<Tab>('review');
  const tables = useAsync(() => adminApi.tables(), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const table = selected ?? tables.data?.[0]?.name ?? null;
  const page = useAsync(() => (table ? adminApi.rows(table, LIMIT, offset) : Promise.resolve(null)), [table, offset]);

  const refresh = () => {
    tables.reload();
    page.reload();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 모바일에선 탭이 제목·동기화 아래 한 줄을 통으로 쓴다 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-lg font-semibold">어드민</h1>
        <div className="ml-auto flex flex-col items-end gap-1 sm:order-3">
          <SyncButton onDone={refresh} />
          <LastSync refreshKey={tables.data} />
        </div>
        <div className="order-4 flex w-full gap-1 overflow-x-auto rounded-md bg-surface-2 p-0.5 text-xs sm:order-2 sm:w-auto">
          {(
            [
              ['targets', '추출 대상'],
              ['review', '추출 검수'],
              ['merge', '중복 병합'],
              ['db', 'DB'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1 font-medium transition-colors ${tab === k ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'targets' && <ExtractionTargets />}
      {tab === 'review' && <ExtractionReview key={String(tables.data?.length)} />}
      {tab === 'merge' && <MergeReview />}
      <div className={`grid gap-4 lg:grid-cols-[220px_1fr] ${tab === 'db' ? '' : 'hidden'}`}>
        <PageState loading={tables.loading} error={tables.error}>
          <TableList
            tables={tables.data ?? []}
            selected={table}
            onSelect={(n) => {
              setSelected(n);
              setOffset(0);
            }}
          />
        </PageState>
        <div className="min-w-0">
          <PageState loading={page.loading && !page.data} error={page.error}>
            {page.data && <DataTable key={table} page={page.data} offset={offset} limit={LIMIT} onPage={setOffset} />}
          </PageState>
        </div>
      </div>
    </div>
  );
}
