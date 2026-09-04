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
  const { profile, localOnly, loading, save } = useProfile(sessionLoading ? undefined : !!me);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (p: typeof EMPTY_PROFILE, local: boolean) => {
    setSubmitting(true);
    setError(null);
    try {
      await save(p, local);
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
        <h1 className="page-title">내 주거 조건</h1>
        <p className="text-sm text-muted">
          입주 자격 계층 판정에 쓰이는 항목만 물어요.{' '}
          {me ? (
            localOnly ? (
              <>생년월일만 계정에 있고 나머지는 이 브라우저에만 보관 중이에요.</>
            ) : (
              <>계정에 저장돼 다른 기기에서도 이어집니다.</>
            )
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
        <ProfileForm
          key={profile ? 'saved' : 'empty'}
          initial={profile ?? EMPTY_PROFILE}
          initialLocalOnly={localOnly}
          canLocalOnly={!!me}
          regions={regions.data ?? []}
          submitting={submitting}
          error={error}
          onSubmit={submit}
        />
      </PageState>
    </div>
  );
}
