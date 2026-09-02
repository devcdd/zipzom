import { useState } from 'react';
import { EMPTY_PROFILE, useProfile } from '@/entities/profile';
import { regionApi } from '@/entities/region';
import { authApi, useSession } from '@/entities/user';
import { ProfileForm } from '@/features/profile-form';
import { useAsync } from '@/shared/lib';
import { PageState } from '@/shared/ui';

export function ProfilePage() {
  const { me, loading: sessionLoading } = useSession();
  const regions = useAsync(() => regionApi.list(), []);
  const { profile, loading, save } = useProfile(sessionLoading ? undefined : !!me);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (p: typeof EMPTY_PROFILE) => {
    setSubmitting(true);
    setError(null);
    try {
      await save(p);
      location.hash = '#/';
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">내 주거 조건</h1>
        <p className="text-sm text-muted">
          행복주택 계층 판정에 쓰이는 항목만 물어요.{' '}
          {me ? (
            <>계정에 저장돼 다른 기기에서도 이어집니다.</>
          ) : (
            <>
              지금은 이 브라우저에만 저장돼요.{' '}
              <a href={authApi.loginUrl} className="text-brand hover:underline">
                카카오 로그인
              </a>
              하면 계정에 옮겨 드려요.
            </>
          )}
        </p>
      </div>
      <PageState loading={loading || regions.loading} error={regions.error}>
        <ProfileForm key={profile ? 'saved' : 'empty'} initial={profile ?? EMPTY_PROFILE} regions={regions.data ?? []} submitting={submitting} error={error} onSubmit={submit} />
      </PageState>
    </div>
  );
}
