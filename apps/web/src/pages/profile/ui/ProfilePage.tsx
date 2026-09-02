import { useState } from 'react';
import { EMPTY_PROFILE, profileApi } from '@/entities/profile';
import { regionApi } from '@/entities/region';
import { getUserId, setUserId } from '@/entities/user';
import { ProfileForm } from '@/features/profile-form';
import { useAsync } from '@/shared/lib';
import { PageState } from '@/shared/ui';

export function ProfilePage() {
  const userId = getUserId();
  const regions = useAsync(() => regionApi.list(), []);
  const profile = useAsync(() => (userId ? profileApi.get(userId) : Promise.resolve(EMPTY_PROFILE)), [userId]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (p: typeof EMPTY_PROFILE) => {
    setSubmitting(true);
    setError(null);
    try {
      if (userId) await profileApi.update(userId, p);
      else setUserId((await profileApi.create(p)).userId);
      location.hash = '#/';
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  // 저장된 프로필이 없는데 userId만 남은 경우(DB 리셋 등)는 새로 만든다
  const initial = profile.error ? EMPTY_PROFILE : profile.data;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">내 주거 조건</h1>
        <p className="text-sm text-muted">행복주택 계층 판정에 쓰이는 항목만 물어요. 브라우저에만 저장되는 식별자로 연결됩니다.</p>
      </div>
      <PageState loading={profile.loading || regions.loading} error={regions.error}>
        {initial && <ProfileForm initial={initial} regions={regions.data ?? []} submitting={submitting} error={error} onSubmit={save} />}
      </PageState>
    </div>
  );
}
