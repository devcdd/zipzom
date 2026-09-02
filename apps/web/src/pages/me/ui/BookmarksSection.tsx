import { bookmarkApi, useBookmarks } from '@/entities/bookmark';
import { NoticeCard } from '@/entities/notice';
import { useAsync } from '@/shared/lib';
import { PageState } from '@/shared/ui';

export function BookmarksSection() {
  const bookmarks = useBookmarks(true);
  const list = useAsync(() => bookmarkApi.notices(), []);
  // 목록에서 해제하면 즉시 사라지도록 현재 북마크 집합으로 거른다. 마감 공고도 그대로 남는다
  const items = (list.data?.items ?? []).filter((n) => bookmarks.ids.has(n.id));

  return (
    <section className="flex flex-col gap-3">
      {list.data && <span className="text-xs text-muted">{items.length}건</span>}
      <PageState
        loading={list.loading}
        error={list.error}
        empty={!list.loading && items.length === 0}
        emptyMessage="아직 북마크한 공고가 없어요. 공고 카드의 별을 눌러 보세요."
      >
        <div className="grid gap-3">
          {items.map((n) => (
            <NoticeCard key={n.id} notice={n} bookmarked onToggleBookmark={() => bookmarks.toggle(n.id)} />
          ))}
        </div>
      </PageState>
    </section>
  );
}
