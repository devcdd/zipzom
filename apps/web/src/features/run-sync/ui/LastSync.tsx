import { useAsync } from '@/shared/lib';
import { syncApi } from '../api/syncApi';

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** 소스별 마지막 동기화 시각. refreshKey가 바뀌면 다시 읽는다 (동기화 버튼 완료 후) */
export function LastSync({ refreshKey }: { refreshKey?: unknown }) {
  const { data } = useAsync(() => syncApi.last(), [refreshKey]);
  if (!data?.length) return null;
  return (
    <p className="text-xs text-muted">
      마지막 동기화{' '}
      {data.map((r) => (
        <span key={r.source} className="ml-2" title={r.error ?? undefined}>
          {r.source} <span className={r.error ? 'text-danger' : 'text-ink'}>{r.finishedAt ? fmt(r.finishedAt) : '진행 중'}</span>
          {r.error && ' ⚠'}
        </span>
      ))}
    </p>
  );
}
