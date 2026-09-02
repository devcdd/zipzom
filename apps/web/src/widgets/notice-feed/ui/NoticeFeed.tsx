import { useState } from 'react';
import { NoticeCard, noticeApi } from '@/entities/notice';
import { isSidoCode, type Region } from '@/entities/region';
import { DEFAULT_FILTERS, NoticeFilters, phaseParam, type NoticeFiltersValue } from '@/features/notice-filters';
import { useAsync } from '@/shared/lib';
import { PageState } from '@/shared/ui';
import { NoticeMap, noticesToMarkers, useNoticeSelection } from '@/widgets/notice-map';

/** 전체 행복주택 공고 + 필터. 매칭과 무관하게 둘러보기용. */
export function NoticeFeed({ regions }: { regions?: Region[] }) {
  const [filters, setFilters] = useState<NoticeFiltersValue>(DEFAULT_FILTERS);
  const { focus, selectedId, showOnMap, selectFromMap } = useNoticeSelection();
  const { regions: picked } = filters;
  const { data, loading, error } = useAsync(
    () =>
      noticeApi.list({
        supplyType: '행복주택',
        phase: phaseParam(filters.phase),
        sido: picked.filter(isSidoCode).map((c) => c.slice(0, 2)),
        sigungu: picked.filter((c) => !isSidoCode(c)),
        q: filters.q || undefined,
        limit: 100,
      }),
    [filters.phase, picked, filters.q],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NoticeFilters value={filters} onChange={setFilters} regions={regions} />
        {data && <span className="text-xs text-muted">{data.total}건</span>}
      </div>
      <PageState loading={loading} error={error} empty={data?.items.length === 0} emptyMessage="조건에 맞는 공고가 없어요.">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="grid gap-3">
            {data?.items.map((n) => (
              <NoticeCard key={n.id} notice={n} selected={selectedId === n.id} onShowMap={() => showOnMap(n.id)} />
            ))}
          </div>
          <NoticeMap
            markers={noticesToMarkers(data?.items ?? [])}
            focus={focus}
            onSelect={selectFromMap}
            className="order-first h-80 lg:order-none lg:sticky lg:top-20 lg:h-[calc(100svh-7rem)]"
          />
        </div>
      </PageState>
    </div>
  );
}
