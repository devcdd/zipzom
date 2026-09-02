import { useState } from 'react';
import { syncApi, type SyncReport } from '../api/syncApi';

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
          마이홈 {report.myhome.notices}건{report.myhome.error && ` (오류: ${report.myhome.error})`} · SH {report.sh.notices}건
          {report.sh.error && ` (오류: ${report.sh.error})`} · 좌표 {report.geocode.resolved}/{report.geocode.attempted}
          {report.geocode.error && ` (중단: ${report.geocode.error})`}
        </span>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
