import type { ReactNode } from 'react';

/** 로딩·오류·빈 상태를 한 자리에서. 셋 다 아니면 children. */
export function PageState({
  loading,
  error,
  empty,
  emptyMessage = '표시할 항목이 없어요.',
  children,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyMessage?: ReactNode;
  children: ReactNode;
}) {
  if (loading) return <p className="py-16 text-center text-sm text-muted">불러오는 중…</p>;
  if (error)
    return (
      <div className="card border-danger/30 bg-danger-soft/40 p-4 text-sm text-danger">
        불러오지 못했어요. <span className="font-mono text-xs">{error}</span>
      </div>
    );
  if (empty) return <div className="card p-10 text-center text-sm text-muted">{emptyMessage}</div>;
  return <>{children}</>;
}
