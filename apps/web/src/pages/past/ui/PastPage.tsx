import { useEffect, useState } from 'react';
import { useBookmarks } from '@/entities/bookmark';
import { NoticeCard, noticeApi } from '@/entities/notice';
import { useSession } from '@/entities/user';
import { useAsync, useDebounce } from '@/shared/lib';
import { PageState } from '@/shared/ui';

const LIMIT = 20;

/** 접수가 끝난 공고. 최신순, 페이지 이동. 지도·필터 없이 카드만 */
export function PastPage() {
  const [offset, setOffset] = useState(0);
  const [input, setInput] = useState('');
  const q = useDebounce(input.trim(), 300);
  const { me, loading: sessionLoading } = useSession();
  const bookmarks = useBookmarks(sessionLoading ? undefined : !!me);
  // 검색은 서버에서 (공고명 + 단지명). 전체 마감 공고가 브라우저에 다 있지 않으므로 프론트 필터로는 못 찾는다
  const page = useAsync(
    () => noticeApi.list({ phase: ['closed'], order: 'recent', q: q || undefined, limit: LIMIT, offset }),
    [offset, q],
  );

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
      <input
        type="search"
        className="field"
        placeholder="공고명·단지명 검색"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOffset(0); // 검색어가 바뀌면 결과 수가 달라지므로 첫 페이지로
        }}
      />
      <PageState
        loading={page.loading && !page.data}
        error={page.error}
        empty={total === 0}
        emptyMessage={q ? `'${q}'에 해당하는 지난 공고가 없어요.` : '지난 공고가 없어요.'}
      >
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
