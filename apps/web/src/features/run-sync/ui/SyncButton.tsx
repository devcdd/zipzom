import { useEffect, useRef, useState } from 'react';
import { syncApi } from '../api/syncApi';

const POLL_MS = 4000;

/**
 * 동기화 시작 후 서버 상태를 폴링한다. 브라우저를 닫아도 서버는 계속 돌고, 다시 열면 진행 중 표시가 이어진다.
 * 끝나면 onDone — 테이블·검수 목록을 새로 읽는 용도
 */
export function SyncButton({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await syncApi.status();
        if (!alive) return;
        if (s.running && startedAt.current === null) startedAt.current = Date.now();
        if (!s.running && running) {
          startedAt.current = null;
          onDone?.();
        }
        setRunning(s.running);
        setElapsed(startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0);
      } catch {
        /* 폴링 실패는 다음 틱에 재시도 */
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const start = async () => {
    setError(null);
    try {
      await syncApi.run();
      startedAt.current = Date.now();
      setRunning(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn-primary" onClick={start} disabled={running}>
        {running ? `동기화 중… ${elapsed}s` : '지금 동기화'}
      </button>
      {running && <span className="text-xs text-muted">수집 → 병합 → 면적 → 자격 추출 → 좌표 순. 브라우저를 닫아도 서버가 계속 돌아요.</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
