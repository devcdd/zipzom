import { useEffect, useState } from 'react';
import { useBookmarks } from '@/entities/bookmark';
import { NoticeCard, SUPPLY_TYPES, noticeApi } from '@/entities/notice';
import { useSession } from '@/entities/user';
import { useAsync } from '@/shared/lib';
import { PageState } from '@/shared/ui';

const LIMIT = 20;

/** 접수가 끝난 공고. 최신순, 페이지 이동. 지도·필터 없이 카드만 */
export function PastPage() {
  const [offset, setOffset] = useState(0);
  const { me, loading: sessionLoading } = useSession();
  const bookmarks = useBookmarks(sessionLoading ? undefined : !!me);
  const page = useAsync(() => noticeApi.list({ supplyTypes: SUPPLY_TYPES, phase: ['closed'], order: 'recent', limit: LIMIT, offset }), [offset]);

  // 페이지가 바뀌면 목록 맨 위로
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [offset]);

  const total = page.data?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + LIMIT, total);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">지난 공고</h1>
          <p className="text-xs text-muted">접수가 끝난 공고를 최근 것부터 보여줘요.</p>
        </div>
        <a href="#/" className="text-xs text-brand hover:underline">
          모집 중 공고로
        </a>
      </div>
      <PageState loading={page.loading && !page.data} error={page.error} empty={total === 0} emptyMessage="지난 공고가 없어요.">
        <div className="grid gap-3">
          {page.data?.items.map((n) => (
            <NoticeCard key={n.id} notice={n} bookmarked={bookmarks.ids.has(n.id)} onToggleBookmark={() => bookmarks.toggle(n.id)} />
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {from}–{to} / {total}건
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost px-2.5 py-1" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
              이전
            </button>
            <button type="button" className="btn-ghost px-2.5 py-1" disabled={to >= total} onClick={() => setOffset(offset + LIMIT)}>
              다음
            </button>
          </div>
        </div>
      </PageState>
    </div>
  );
}
