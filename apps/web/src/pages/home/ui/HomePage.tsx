import { useState } from 'react';
import { matchApi } from '@/entities/match';
import { NoticeCard } from '@/entities/notice';
import { regionApi } from '@/entities/region';
import { getUserId } from '@/entities/user';
import { useAsync, withinDays } from '@/shared/lib';
import { PageState } from '@/shared/ui';
import { EligibilitySummary } from '@/widgets/eligibility-summary';
import { NoticeFeed } from '@/widgets/notice-feed';
import { NoticeMap, noticesToMarkers, type MapFocus } from '@/widgets/notice-map';

type Mode = 'matches' | 'all';

const scrollToNotice = (noticeId: number) => {
  document.getElementById(`notice-${noticeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

export function HomePage() {
  const userId = getUserId();
  const [mode, setMode] = useState<Mode>(userId ? 'matches' : 'all');
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const regions = useAsync(() => regionApi.list(), []);
  const matches = useAsync(() => (userId && mode === 'matches' ? matchApi.get(userId) : Promise.resolve(null)), [userId, mode]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">행복주택 공고</h1>
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
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1 transition-colors ${mode === m ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'all' && <NoticeFeed regions={regions.data} />}

      {mode === 'matches' && !userId && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-muted">나이·소득·지역 조건을 등록하면 자격에 맞는 공고만 골라 보여드려요.</p>
          <a href="#/profile" className="btn-primary">
            조건 등록하기
          </a>
        </div>
      )}

      {mode === 'matches' && userId && (
        <PageState loading={matches.loading} error={matches.error}>
          {matches.data && (
            <>
              <EligibilitySummary evaluations={matches.data.evaluations} />
              {matches.data.eligible && (
                <>
                  <p className="text-xs text-muted">모집 중·예정 {matches.data.notices.length}건 · 관심 지역 기준</p>
                  {matches.data.notices.length === 0 ? (
                    <div className="card p-10 text-center text-sm text-muted">관심 지역에 모집 중인 행복주택 공고가 없어요. 전체 공고에서 다른 지역도 살펴보세요.</div>
                  ) : (
                    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
                      <div className="grid gap-3">
                        {matches.data.notices.map((n) => (
                          <NoticeCard key={n.id} notice={n} isNew={withinDays(n.matchedAt, 3)} onShowMap={() => setFocus({ noticeId: n.id, at: Date.now() })} />
                        ))}
                      </div>
                      <NoticeMap
                        markers={noticesToMarkers(matches.data.notices)}
                        focus={focus}
                        onSelect={scrollToNotice}
                        className="order-first h-80 lg:order-none lg:sticky lg:top-20 lg:h-[calc(100svh-7rem)]"
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </PageState>
      )}
    </div>
  );
}
