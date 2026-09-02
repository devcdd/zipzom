import { useState, type FormEvent } from 'react';
import { authApi } from '@/entities/user';

export function AccountSection({ nickname: initial, onSaved }: { nickname: string; onSaved: () => void }) {
  const [nickname, setNickname] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await authApi.updateNickname(nickname.trim());
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">닉네임</h2>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <input className="field" maxLength={20} required value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </label>
        <button type="submit" className="btn-primary" disabled={saving || nickname.trim() === '' || nickname.trim() === initial}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </form>
      {saved && <p className="mt-2 text-xs text-brand">닉네임을 바꿨어요.</p>}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </section>
  );
}
