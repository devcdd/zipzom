import { authApi, useSession } from '@/entities/user';
import { AdminBrowser } from '@/widgets/admin-browser';

export function AdminPage() {
  const { me, loading } = useSession();
  if (loading) return null;
  if (!me?.isAdmin)
    return (
      <div className="card mx-auto max-w-md p-10 text-center text-sm text-muted">
        {me ? (
          <>어드민 권한이 없는 계정이에요.</>
        ) : (
          <>
            <a href={authApi.loginUrl} className="text-brand hover:underline">
              카카오 로그인
            </a>{' '}
            후 어드민 계정만 들어올 수 있어요.
          </>
        )}
      </div>
    );
  return <AdminBrowser />;
}
