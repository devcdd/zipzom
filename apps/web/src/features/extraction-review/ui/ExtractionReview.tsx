import { useState } from 'react';
import { useAsync } from '@/shared/lib';
import { PageState, Tag, type TagTone } from '@/shared/ui';
import { extractionApi, type ExtractedHouse, type Extraction } from '../api/extractionApi';

const STATUS: Record<Extraction['status'], { label: string; tone: TagTone }> = {
  PENDING: { label: '검수 대기', tone: 'warn' },
  APPROVED: { label: '승인', tone: 'brand' },
  REJECTED: { label: '반려', tone: 'muted' },
  FAILED: { label: '추출 실패', tone: 'danger' },
};

const COLS: { key: keyof ExtractedHouse; label: string; num?: boolean }[] = [
  { key: 'name', label: '단지명' },
  { key: 'address', label: '주소' },
  { key: 'supplyCount', label: '공급호수', num: true },
  { key: 'totalHouseholds', label: '총세대', num: true },
  { key: 'minDeposit', label: '최저 보증금(원)', num: true },
  { key: 'minMonthlyRent', label: '최저 월세(원)', num: true },
];

const EMPTY: ExtractedHouse = { name: '', address: null, supplyCount: null, totalHouseholds: null, minDeposit: null, minMonthlyRent: null };

/** 원문 PDF 링크 옆에 추출 표를 셀 단위로 고쳐서 승인. 승인 전엔 지도·목록에 아무것도 반영되지 않는다. */
function ExtractionCard({ item, onChanged }: { item: Extraction; onChanged: () => void }) {
  const [houses, setHouses] = useState<ExtractedHouse[]>(item.houses ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = item.status === 'PENDING';

  const set = (i: number, key: keyof ExtractedHouse, raw: string) =>
    setHouses((hs) => hs.map((h, j) => (j === i ? { ...h, [key]: COLS.find((c) => c.key === key)?.num ? (raw === '' ? null : Number(raw)) : raw || null } : h)));

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Tag tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Tag>
            <span className="text-xs text-muted">#{item.noticeId} · {item.model ?? '—'}</span>
          </div>
          <h2 className="mt-1 truncate text-sm font-semibold">{item.title}</h2>
          <div className="mt-1 flex gap-3 text-xs">
            <a href={item.pdfUrl} target="_blank" rel="noreferrer" className="text-brand underline">
              공고문 PDF{item.pdfName && ` · ${item.pdfName}`}
            </a>
            {item.detailUrl && (
              <a href={item.detailUrl} target="_blank" rel="noreferrer" className="text-muted underline">
                SH 공고 페이지
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          {editable && (
            <>
              <button type="button" className="btn-ghost px-2.5 py-1 text-xs" disabled={busy} onClick={() => setHouses((hs) => [...hs, EMPTY])}>
                행 추가
              </button>
              <button type="button" className="btn-ghost px-2.5 py-1 text-xs" disabled={busy} onClick={() => run(() => extractionApi.reject(item.noticeId))}>
                반려
              </button>
              <button
                type="button"
                className="btn-primary px-2.5 py-1 text-xs"
                disabled={busy || houses.length === 0 || houses.some((h) => !h.name.trim())}
                onClick={() => run(() => extractionApi.approve(item.noticeId, houses))}
              >
                {busy ? '반영 중…' : `승인 · ${houses.length}개 단지 반영`}
              </button>
            </>
          )}
          {item.status !== 'APPROVED' && (
            <button type="button" className="btn-ghost px-2.5 py-1 text-xs" disabled={busy} onClick={() => run(() => extractionApi.retry(item.noticeId))}>
              {busy ? '추출 중…' : '다시 추출'}
            </button>
          )}
        </div>
      </div>
      {item.error && <p className="mt-2 font-mono text-xs text-danger">{item.error}</p>}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {houses.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                {COLS.map((c) => (
                  <th key={c.key} className="px-2 py-1.5 font-medium">
                    {c.label}
                  </th>
                ))}
                {editable && <th className="w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {houses.map((h, i) => (
                <tr key={i}>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-1 py-1">
                      {editable ? (
                        <input
                          className={`field px-2 py-1 ${c.num ? 'text-right' : ''} ${c.key === 'address' ? 'min-w-64' : c.num ? 'w-28' : 'min-w-40'}`}
                          type={c.num ? 'number' : 'text'}
                          value={h[c.key] ?? ''}
                          onChange={(e) => set(i, c.key, e.target.value)}
                        />
                      ) : (
                        <span className={c.num ? 'block text-right tabular-nums' : ''}>{h[c.key]?.toLocaleString('ko-KR') ?? '—'}</span>
                      )}
                    </td>
                  ))}
                  {editable && (
                    <td className="px-1 text-center">
                      <button type="button" className="text-muted hover:text-danger" title="행 삭제" onClick={() => setHouses((hs) => hs.filter((_, j) => j !== i))}>
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ExtractionReview() {
  const list = useAsync(() => extractionApi.list(), []);
  return (
    <PageState loading={list.loading && !list.data} error={list.error} empty={list.data?.length === 0} emptyMessage="추출된 공고가 없어요. 동기화 후 SH 공고가 들어오면 여기 쌓여요.">
      <div className="flex flex-col gap-3">
        {list.data?.map((item) => (
          <ExtractionCard key={`${item.noticeId}-${item.status}-${item.createdAt}`} item={item} onChanged={list.reload} />
        ))}
      </div>
    </PageState>
  );
}
