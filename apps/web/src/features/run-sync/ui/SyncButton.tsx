import { useState } from 'react';
import { syncApi, type SyncReport } from '../api/syncApi';

const SOURCES = [
  ['마이홈', 'myhome'],
  ['SH', 'sh'],
  ['HUG', 'hug'],
] as const;

export function SyncButton({ onDone }: { onDone?: (r: SyncReport) => void }) {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await syncApi.run();
      setReport(r);
      onDone?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn-primary" onClick={run} disabled={busy}>
        {busy ? '동기화 중…' : '지금 동기화'}
      </button>
      {report && (
        <span className="text-xs text-muted">
          {SOURCES.map(([label, key]) => (
            <span key={key}>
              {label} {report[key].notices}건{report[key].error && ` (오류: ${report[key].error})`} ·{' '}
            </span>
          ))}
          좌표 {report.geocode.resolved}/{report.geocode.attempted}
          {report.geocode.error && ` (중단: ${report.geocode.error})`}
        </span>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
