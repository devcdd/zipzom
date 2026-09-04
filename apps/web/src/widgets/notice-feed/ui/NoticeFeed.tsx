import { useState } from 'react';
import { useBookmarks } from '@/entities/bookmark';
import { NoticeCard, noticeApi } from '@/entities/notice';
import { isSidoCode, type Region } from '@/entities/region';
import { useSession } from '@/entities/user';
import { DEFAULT_FILTERS, NoticeFilters, phaseParam, type NoticeFiltersValue } from '@/features/notice-filters';
import { useAsync, useDebounce } from '@/shared/lib';
import { PageState } from '@/shared/ui';
import { NoticeMap, noticesToMarkers, useNoticeSelection } from '@/widgets/notice-map';

/** 수집한 전체 공고 + 필터. 매칭과 무관하게 둘러보기용. */
export function NoticeFeed({ regions }: { regions?: Region[] }) {
  const [filters, setFilters] = useState<NoticeFiltersValue>(DEFAULT_FILTERS);
  const [wide, setWide] = useState(false); // 데스크톱 지도 전체 폭
  const { me, loading: sessionLoading } = useSession();
  const bookmarks = useBookmarks(sessionLoading ? undefined : !!me);
  const { focus, selectedId, selectedHouseId, showOnMap, selectFromMap } = useNoticeSelection();
  const { regions: picked, supplyTypes } = filters;
  const q = useDebounce(filters.q.trim(), 300);
  const { data, loading, error } = useAsync(
    () =>
      noticeApi.list({
        phase: phaseParam(filters.phase),
        supplyTypes: supplyTypes.length > 0 ? supplyTypes : undefined,
        sido: picked.filter(isSidoCode).map((c) => c.slice(0, 2)),
        sigungu: picked.filter((c) => !isSidoCode(c)),
        q: q || undefined,
        limit: 100,
      }),
    [filters.phase, picked, supplyTypes, q],
  );

  const ordered = data ? [...data.items].sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId)) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NoticeFilters value={filters} onChange={setFilters} regions={regions} />
        {data && <span className="text-xs text-muted">{data.total}건</span>}
      </div>
      <PageState loading={loading} error={error} empty={data?.items.length === 0} emptyMessage="조건에 맞는 공고가 없어요.">
        <div className={`grid items-start gap-4 ${wide ? "" : "lg:grid-cols-[minmax(0,1fr)_400px]"}`}>
          <div className="grid gap-3">
            {ordered.map((n) => (
              <NoticeCard
                key={n.id}
                notice={n}
                selected={selectedId === n.id}
                selectedHouseId={selectedId === n.id ? selectedHouseId : null}
                bookmarked={bookmarks.ids.has(n.id)}
                onToggleBookmark={() => bookmarks.toggle(n.id)}
                onShowMap={() => showOnMap(n.id)}
                onShowHouse={(hid) => showOnMap(n.id, hid)}
              />
            ))}
          </div>
          <NoticeMap
            markers={noticesToMarkers(data?.items ?? [])}
            focus={focus}
            onSelect={selectFromMap}
            className={wide ? "order-first h-80 lg:h-[70svh]" : "order-first h-80 lg:order-none lg:sticky lg:top-20 lg:h-[calc(100svh-7rem)]"}
            expanded={wide}
            onToggleExpand={() => setWide((v) => !v)}
          />
        </div>
      </PageState>
    </div>
  );
}
