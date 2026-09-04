import { useMemo, useState } from 'react';
import { useBookmarks } from '@/entities/bookmark';
import { matchApi } from '@/entities/match';
import { NoticeCard, sortForMe, type SupplyTypeCount } from '@/entities/notice';
import { useProfile } from '@/entities/profile';
import { SupplyTypePicker } from '@/features/notice-filters';
import { regionApi } from '@/entities/region';
import { useSession } from '@/entities/user';
import { useAsync, withinDays } from '@/shared/lib';
import { PageState, ScrollTopButton } from '@/shared/ui';
import { EligibilitySummary } from '@/widgets/eligibility-summary';
import { NoticeFeed } from '@/widgets/notice-feed';
import { NoticeMap, noticesToMarkers, useNoticeSelection } from '@/widgets/notice-map';

type Mode = 'matches' | 'all';

export function HomePage() {
  const { me, loading: sessionLoading } = useSession();
  const { profile, loading: profileLoading } = useProfile(sessionLoading ? undefined : !!me);
  const bookmarks = useBookmarks(sessionLoading ? undefined : !!me);
  const [mode, setMode] = useState<Mode | null>(null);
  const [wide, setWide] = useState(false); // 데스크톱 지도 전체 폭
  const [supplyTypes, setSupplyTypes] = useState<string[]>([]);
  // 프로필 확인 전엔 탭을 고정하지 않는다. 있으면 내 매칭, 없으면 전체 공고
  const effectiveMode: Mode = mode ?? (profile ? 'matches' : 'all');
  const { focus, selectedId, selectedHouseId, showOnMap, selectFromMap } = useNoticeSelection();
  const regions = useAsync(() => regionApi.list(), []);
  const matches = useAsync(() => (profile && effectiveMode === 'matches' ? matchApi.evaluate(profile) : Promise.resolve(null)), [profile, effectiveMode]);

  // 매칭 결과는 이미 전부 받아온 상태(최대 200건)라 유형 필터는 서버에 다시 묻지 않고 여기서 거른다.
  // 서버로 넘기면 필터를 만질 때마다 자격 규칙 판정이 통째로 다시 돌아간다
  const matched = matches.data?.notices;
  const typeOptions: SupplyTypeCount[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of matched ?? []) if (n.supplyType) counts.set(n.supplyType, (counts.get(n.supplyType) ?? 0) + 1);
    return [...counts].map(([supplyType, count]) => ({ supplyType, count })).sort((a, b) => b.count - a.count);
  }, [matched]);
  const visible = useMemo(
    () => (supplyTypes.length === 0 ? (matched ?? []) : (matched ?? []).filter((n) => n.supplyType && supplyTypes.includes(n.supplyType))),
    [matched, supplyTypes],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">LH · SH · HUG · 마이홈 공고</h1>
        <div role="radiogroup" className="inline-flex rounded-md border border-line bg-surface p-0.5 text-sm">
          {(
            [
              ['matches', '내 매칭'],
              ['all', '전체 공고'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={effectiveMode === m}
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1 transition-colors ${effectiveMode === m ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {effectiveMode === 'all' && <NoticeFeed regions={regions.data} />}

      {effectiveMode === 'matches' && !profileLoading && !profile && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-muted">나이·소득·지역 조건을 등록하면 자격에 맞는 공고만 골라 보여드려요.</p>
          <a href="#/profile" className="btn-primary">
            조건 등록하기
          </a>
        </div>
      )}

      {effectiveMode === 'matches' && profile && (
        <PageState loading={matches.loading} error={matches.error}>
          {matches.data && (
            <>
              <EligibilitySummary evaluations={matches.data.evaluations} />
              {matches.data.eligible && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {typeOptions.length > 1 && <SupplyTypePicker value={supplyTypes} options={typeOptions} onChange={setSupplyTypes} />}
                    <p className="text-xs text-muted">
                      모집 중·예정 {visible.length}건{supplyTypes.length > 0 && ` / 전체 ${matches.data.notices.length}건`} · 관심 지역 기준
                    </p>
                  </div>
                  {visible.length === 0 ? (
                    <div className="card p-10 text-center text-sm text-muted">
                      {supplyTypes.length > 0 ? '고른 공급유형에 해당하는 공고가 없어요.' : '관심 지역에 모집 중인 공고가 없어요. 전체 공고에서 다른 지역도 살펴보세요.'}
                    </div>
                  ) : (
                    <div className={`grid items-start gap-4 ${wide ? "" : "lg:grid-cols-[minmax(0,1fr)_400px]"}`}>
                      <div className="grid gap-3">
                        {sortForMe(visible, selectedId).map((n) => (
                          <NoticeCard
                            key={n.id}
                            notice={n}
                            isNew={withinDays(n.matchedAt, 3)}
                            unverified={n.unverified}
                            selected={selectedId === n.id}
                            selectedHouseId={selectedId === n.id ? selectedHouseId : null}
                            bookmarked={bookmarks.ids.has(n.id)}
                            highlightGroups={n.matchedCodes}
                            onToggleBookmark={() => bookmarks.toggle(n.id)}
                            onShowMap={() => showOnMap(n.id)}
                            onShowHouse={(hid) => showOnMap(n.id, hid)}
                          />
                        ))}
                      </div>
                      <NoticeMap
                        markers={noticesToMarkers(visible)}
                        focus={focus}
                        onSelect={selectFromMap}
                        className={wide ? "order-first h-80 lg:h-[70svh]" : "order-first h-80 lg:order-none lg:sticky lg:top-20 lg:h-[calc(100svh-7rem)]"}
                        expanded={wide}
                        onToggleExpand={() => setWide((v) => !v)}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </PageState>
      )}

      <div className="flex justify-center pt-2">
        <a href="#/past" className="btn-ghost">
          지난 공고 보기
        </a>
      </div>
      <ScrollTopButton />
    </div>
  );
}
