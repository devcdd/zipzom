import { useEffect, useRef, useState } from 'react';
import { syncApi } from '../api/syncApi';

const POLL_MS = 4000;

/**
 * 동기화 시작 후 서버 상태를 폴링한다. 브라우저를 닫아도 서버는 계속 돌고, 다시 열면 진행 중 표시가 이어진다.
 * 끝나면 onDone — 테이블·검수 목록을 새로 읽는 용도
 */
/** 초 → "3분 12초". 동기화는 수십 분 걸려서 초만 찍으면 읽기 어렵다 */
const fmtElapsed = (sec: number) => (sec < 60 ? `${sec}초` : `${Math.floor(sec / 60)}분 ${sec % 60}초`);

export function SyncButton({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  // 서버가 알려준 시작 시각. 새로고침해도 경과 시간이 0부터 다시 시작하지 않는다
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await syncApi.status();
        if (!alive) return;
        startedAt.current = s.startedAt ? Date.parse(s.startedAt) : null;
        if (!s.running && running) onDone?.();
        setRunning(s.running);
        setElapsed(startedAt.current ? Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)) : 0);
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

  // 상태 폴링은 4초 간격이라, 경과 시간만 1초마다 다시 계산해 초가 끊기지 않게 한다
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (startedAt.current) setElapsed(Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const start = async () => {
    setError(null);
    try {
      await syncApi.run();
      setRunning(true);
      // 시작 시각은 다음 폴링에서 서버 값으로 채운다
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn-primary" onClick={start} disabled={running}>
        {running ? `동기화 중… ${fmtElapsed(elapsed)}` : '지금 동기화'}
      </button>
      {running && <span className="text-xs text-muted">수집 → 병합 → 면적 → 자격 추출 → 좌표 순. 브라우저를 닫아도 서버가 계속 돌아요.</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
