import { useState } from 'react';
import { useAsync } from '@/shared/lib';
import { PageState, Tag } from '@/shared/ui';
import { mergeApi } from '../api/mergeApi';

/** 같은 공고가 여러 소스에 올라온 것을 묶은 결과. 오탐이면 해제해 다시 노출한다. */
export function MergeReview() {
  const pairs = useAsync(() => mergeApi.list(), []);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unlink = async (id: number) => {
    setBusy(id);
    setError(null);
    try {
      await mergeApi.unlink(id);
      pairs.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        제목이 같은 공고를 묶어 대표 1건만 목록에 보여줍니다. 아래는 숨겨진 쪽이에요. 다른 공고인데 묶였으면 해제하세요.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <PageState loading={pairs.loading} error={pairs.error} empty={pairs.data?.length === 0} emptyMessage="병합된 공고가 없어요.">
        <ul className="grid gap-2">
          {pairs.data?.map((p) => (
            <li key={p.id} className="card grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0 text-[13px]">
                <div className="flex items-center gap-1.5">
                  <Tag tone="ink">{p.canonicalSource}</Tag>
                  <span className="truncate font-medium">{p.canonicalTitle}</span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {p.canonicalPostedOn ?? '—'} · 단지 {p.canonicalHouseCount}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-muted">
                  <span className="shrink-0 text-[11px]">숨김</span>
                  <Tag>{p.source}</Tag>
                  <span className="truncate line-through decoration-line">{p.title}</span>
                  <span className="shrink-0 text-[11px]">{p.postedOn ?? '—'}</span>
                  {p.detailUrl && (
                    <a href={p.detailUrl} target="_blank" rel="noreferrer" className="shrink-0 text-brand hover:underline">
                      원문 ↗
                    </a>
                  )}
                </div>
              </div>
              <button type="button" className="btn-ghost justify-self-start" disabled={busy === p.id} onClick={() => unlink(p.id)}>
                {busy === p.id ? '해제 중…' : '병합 해제'}
              </button>
            </li>
          ))}
        </ul>
      </PageState>
    </section>
  );
}
