import { useEffect, useState } from 'react';
import { useAsync, useDebounce } from '@/shared/lib';
import { PageState, Tag, type TagTone } from '@/shared/ui';
import { extractionApi, type Extraction, type ExtractTarget } from '../api/extractionApi';

const LIMIT = 50;
const SOURCES = ['MYHOME', 'LH', 'SH', 'HUG'] as const;
const STATUS: Record<Extraction['status'], { label: string; tone: TagTone }> = {
  PENDING: { label: '검수 대기', tone: 'warn' },
  APPROVED: { label: '승인', tone: 'brand' },
  REJECTED: { label: '반려', tone: 'muted' },
  FAILED: { label: '실패', tone: 'danger' },
};

/** 어드민이 공고를 골라 공고문 PDF 추출을 돌린다. 건당 LLM 입력이 10만 토큰대라 자동으로는 안 돈다 */
export function ExtractionTargets() {
  const [source, setSource] = useState<Extraction['source'] | ''>('');
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [input, setInput] = useState('');
  const q = useDebounce(input.trim(), 300);
  const [offset, setOffset] = useState(0);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const page = useAsync(
    () => extractionApi.targets({ source: source || undefined, q: q || undefined, onlyMissing, limit: LIMIT, offset }),
    [source, q, onlyMissing, offset],
  );
  const queue = useAsync(() => extractionApi.queue(), []);
  const total = page.data?.total ?? 0;
  const items = page.data?.items ?? [];

  // 추출은 백그라운드라 큐가 빌 때까지 폴링하고, 끝나면 상태를 다시 읽는다
  useEffect(() => {
    if (!queue.data?.running) return;
    const t = setTimeout(() => {
      queue.reload();
      page.reload();
    }, 5000);
    return () => clearTimeout(t);
  }, [queue.data, queue, page]);

  const toggle = (id: number) =>
    setChecked((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const allChecked = items.length > 0 && items.every((it) => checked.has(it.id));
  const toggleAll = () =>
    setChecked((s) => {
      const next = new Set(s);
      for (const it of items) {
        if (allChecked) next.delete(it.id);
        else next.add(it.id);
      }
      return next;
    });

  const run = async () => {
    setError(null);
    try {
      await extractionApi.run([...checked]);
      setChecked(new Set());
      queue.reload();
      page.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* .field는 w-full이라 폭은 감싸는 div로 준다 */}
        <div className="w-32">
          <select
            className="field text-xs"
            value={source}
            onChange={(e) => {
              setSource(e.target.value as Extraction['source'] | '');
              setOffset(0);
            }}
          >
            <option value="">전체 소스</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-40 flex-1 sm:w-56 sm:flex-none">
          <input
            type="search"
            className="field text-xs"
            placeholder="공고명 검색"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOffset(0);
            }}
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => {
              setOnlyMissing(e.target.checked);
              setOffset(0);
            }}
          />
          추출 안 한 공고만
        </label>
        <div className="ml-auto flex w-full items-center justify-end gap-2 text-xs sm:w-auto">
          {queue.data?.running && <span className="text-muted">추출 중… 남은 {queue.data.queued}건</span>}
          <button type="button" className="btn-primary px-3 py-1 text-xs" disabled={checked.size === 0} onClick={run}>
            선택 {checked.size}건 추출
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <PageState loading={page.loading && !page.data} error={page.error} empty={total === 0} emptyMessage="조건에 맞는 공고가 없어요.">
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="w-9 p-2">
                  <input type="checkbox" className="size-4" checked={allChecked} onChange={toggleAll} aria-label="이 페이지 전체 선택" />
                </th>
                <th className="p-2">공고</th>
                <th className="hidden w-20 p-2 sm:table-cell">소스</th>
                <th className="hidden w-24 p-2 sm:table-cell">유형</th>
                <th className="hidden w-24 p-2 sm:table-cell">공고일</th>
                <th className="w-20 p-2">추출</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <Row key={it.id} item={it} checked={checked.has(it.id)} onToggle={() => toggle(it.id)} />
              ))}
            </tbody>
          </table>
        </div>
      </PageState>
      <div className="flex items-center justify-end gap-2 text-xs text-muted">
        <span>
          {total === 0 ? 0 : offset + 1}–{Math.min(offset + LIMIT, total)} / {total}
        </span>
        <button type="button" className="btn-ghost px-2.5 py-1" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
          이전
        </button>
        <button type="button" className="btn-ghost px-2.5 py-1" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>
          다음
        </button>
      </div>
    </div>
  );
}

function Row({ item, checked, onToggle }: { item: ExtractTarget; checked: boolean; onToggle: () => void }) {
  const status = item.extractionStatus && STATUS[item.extractionStatus];
  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="p-2">
        <input type="checkbox" className="size-4" checked={checked} onChange={onToggle} aria-label={item.title} />
      </td>
      <td className="p-2">
        {item.detailUrl ? (
          <a href={item.detailUrl} target="_blank" rel="noreferrer" className="hover:underline">
            {item.title}
          </a>
        ) : (
          item.title
        )}
        {/* 접힌 열을 모바일에선 제목 아래 한 줄로 */}
        <div className="mt-0.5 text-2xs text-muted sm:hidden">
          {item.source} · {item.supplyType ?? '—'} · {item.postedOn ?? '—'}
        </div>
      </td>
      <td className="hidden p-2 text-muted sm:table-cell">{item.source}</td>
      <td className="hidden p-2 text-muted sm:table-cell">{item.supplyType ?? '—'}</td>
      <td className="hidden p-2 text-muted sm:table-cell">{item.postedOn ?? '—'}</td>
      <td className="p-2">{status ? <Tag tone={status.tone}>{status.label}</Tag> : <span className="text-muted">—</span>}</td>
    </tr>
  );
}
