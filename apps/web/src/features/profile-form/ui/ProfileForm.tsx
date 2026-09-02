import { useState, type FormEvent, type ReactNode } from 'react';
import { MARITAL_LABEL, type MaritalStatus, type Profile } from '@/entities/profile';
import { groupBySido, isSidoCode, mergeSidos, regionLabel, type Region } from '@/entities/region';
import { ageOn, toManwon, toWon } from '@/shared/lib';
import { DateParts } from './DateParts';

const MARITALS = Object.keys(MARITAL_LABEL) as MaritalStatus[];

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input type="checkbox" className="mt-0.5 size-4 accent-brand" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <span className="block text-[11px] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function ProfileForm({
  initial,
  initialLocalOnly = false,
  canLocalOnly = false,
  regions,
  submitting,
  error,
  onSubmit,
}: {
  initial: Profile;
  initialLocalOnly?: boolean;
  canLocalOnly?: boolean; // 로그인 상태에서만 "서버에 저장하지 않을래요" 노출
  regions: Region[];
  submitting: boolean;
  error: string | null;
  onSubmit: (p: Profile, localOnly: boolean) => void;
}) {
  const [p, setP] = useState<Profile>(initial);
  const [localOnly, setLocalOnly] = useState(initialLocalOnly);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((prev) => ({ ...prev, [k]: v }));
  const sidos = mergeSidos(regions);
  const groups = groupBySido(regions, sidos);
  const mySigungu = regions.filter((r) => r.sidoCode === p.sidoCode && !isSidoCode(r.code));
  const married = p.maritalStatus !== 'SINGLE';

  /**
   * 시도 전체('XX000')는 하위 구 전부와 한 몸으로 움직인다.
   * 전체 클릭 → 구 전부 on/off. 구 하나 빼면 전체도 빠지고, 구를 다 채우면 전체가 자동으로 붙는다
   */
  const togglePreferred = (code: string) => {
    const group = groups.find((g) => g.regions.some((r) => r.code === code));
    if (!group) return;
    const sidoAll = `${group.sido.code}000`;
    const gus = group.regions.map((r) => r.code).filter((c) => c !== sidoAll);
    const others = p.preferredSigunguCodes.filter((c) => c !== sidoAll && !gus.includes(c));
    const selected = new Set(p.preferredSigunguCodes.filter((c) => gus.includes(c)));
    if (code === sidoAll) {
      const allOn = gus.every((c) => selected.has(c));
      set('preferredSigunguCodes', allOn ? others : [...others, sidoAll, ...gus]);
      return;
    }
    if (selected.has(code)) selected.delete(code);
    else selected.add(code);
    const full = gus.every((c) => selected.has(c));
    set('preferredSigunguCodes', [...others, ...(full ? [sidoAll] : []), ...gus.filter((c) => selected.has(c))]);
  };

  const [localError, setLocalError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    // required는 빈 칸만 잡는다. 2월 31일처럼 존재하지 않는 날짜는 DateParts가 ''로 넘기므로 여기서 거른다
    if (!p.birthDate) return setLocalError('생년월일을 올바르게 입력해 주세요');
    setLocalError(null);
    onSubmit(
      {
        ...p,
        marriedAt: p.maritalStatus === 'MARRIED' ? p.marriedAt || null : null,
        youngestChildBirthDate: p.childrenCount > 0 ? p.youngestChildBirthDate || null : null,
        dualIncome: married && p.dualIncome,
        sigunguCode: mySigungu.some((r) => r.code === p.sigunguCode) ? p.sigunguCode : null,
      },
      canLocalOnly && localOnly,
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Section title="기본">
        <Field label="생년월일" hint={p.birthDate ? `만 ${ageOn(p.birthDate)}세` : undefined}>
          <DateParts required value={p.birthDate} onChange={(v) => set('birthDate', v)} />
        </Field>
        <Field label="혼인 상태">
          <div className="flex gap-1 rounded-md border border-line bg-surface p-0.5 text-sm">
            {MARITALS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set('maritalStatus', m)}
                className={`flex-1 rounded px-2 py-1.5 ${p.maritalStatus === m ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
              >
                {MARITAL_LABEL[m]}
              </button>
            ))}
          </div>
        </Field>
        {p.maritalStatus === 'MARRIED' && (
          <Field label="혼인신고일" hint="신혼부부 계층은 7년 이내">
            <DateParts value={p.marriedAt ?? ''} onChange={(v) => set('marriedAt', v || null)} />
          </Field>
        )}
        <Field label="자녀 수">
          <input type="number" min={0} max={20} className="field" value={p.childrenCount} onChange={(e) => set('childrenCount', Number(e.target.value))} />
        </Field>
        {p.childrenCount > 0 && (
          <Field label="막내 자녀 생년월일" hint="태아는 출산 예정일. 만 6세 이하면 신혼부부·한부모 계층">
            <DateParts value={p.youngestChildBirthDate ?? ''} onChange={(v) => set('youngestChildBirthDate', v || null)} />
          </Field>
        )}
      </Section>

      <Section title="가구 · 소득">
        <Field label="가구원 수" hint="본인 포함. 1인 +20%p, 2인 +10%p 소득기준 가산">
          <input type="number" min={1} max={20} className="field" required value={p.householdSize} onChange={(e) => set('householdSize', Number(e.target.value))} />
        </Field>
        <Field label="세대 월평균 소득 (만원)" hint="세대원 합계, 세전. 건강보험 보수월액 기준">
          <input type="number" min={0} step={1} className="field" required value={toManwon(p.householdMonthlyIncome)} onChange={(e) => set('householdMonthlyIncome', toWon(e.target.value))} />
        </Field>
        {married && (
          <div className="sm:col-span-2">
            <Toggle label="맞벌이" hint="신혼부부 계층 소득기준 120%" checked={p.dualIncome} onChange={(v) => set('dualIncome', v)} />
          </div>
        )}
      </Section>

      <Section title="주택 · 자산">
        <div className="sm:col-span-2">
          <Toggle label="무주택세대구성원" hint="세대 전원 주택·분양권 미소유" checked={p.isHomeless} onChange={(v) => set('isHomeless', v)} />
        </div>
        <Field label="총자산 (만원)" hint="비우면 통과로 계산. 부동산+자동차+금융+일반자산−부채">
          <input type="number" min={0} className="field" value={toManwon(p.totalAssets)} onChange={(e) => set('totalAssets', e.target.value === '' ? null : toWon(e.target.value))} />
        </Field>
        <Field label="자동차가액 (만원)" hint="미보유면 비우기">
          <input type="number" min={0} className="field" value={toManwon(p.carValue)} onChange={(e) => set('carValue', e.target.value === '' ? null : toWon(e.target.value))} />
        </Field>
      </Section>

      <Section title="해당 여부">
        <Toggle label="대학생 · 졸업(중퇴) 2년 이내" checked={p.isStudent} onChange={(v) => set('isStudent', v)} />
        <Toggle label="주거급여 수급자" checked={p.isHousingBenefitRecipient} onChange={(v) => set('isHousingBenefitRecipient', v)} />
        <Toggle label="산업단지 입주기업 근로자" hint="산업단지형 행복주택 계층. 교육·연구기관 포함" checked={p.isIndustrialWorker} onChange={(v) => set('isIndustrialWorker', v)} />
        <Toggle label="주택청약종합저축 가입" hint="대부분 공고가 입주 전까지 가입을 요구" checked={p.hasSubscriptionAccount} onChange={(v) => set('hasSubscriptionAccount', v)} />
        <Field label="재직기간 (년)" hint="사회초년생은 보통 5년 이내. 무직이면 비워두세요">
          <input type="number" min={0} max={60} className="field" value={p.employedYears ?? ''} onChange={(e) => set('employedYears', e.target.value === '' ? null : Number(e.target.value))} />
        </Field>
      </Section>

      <Section title="지역">
        <Field label="거주 시도">
          <select className="field" required value={p.sidoCode} onChange={(e) => (set('sidoCode', e.target.value), set('sigunguCode', null))}>
            {sidos.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="거주 시군구" hint="공고가 있는 지역만 표시">
          <select className="field" value={p.sigunguCode ?? ''} onChange={(e) => set('sigunguCode', e.target.value || null)}>
            <option value="">선택 안 함</option>
            {mySigungu.map((r) => (
              <option key={r.code} value={r.code}>
                {regionLabel(r)}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <span className="label">관심 지역</span>
          <p className="mb-2 text-[11px] text-muted">비우면 거주 시도 전체. 숫자는 현재 수집된 단지 수.</p>
          <div className="flex flex-col gap-2">
            {groups.map((g) => (
              <div key={g.sido.code} className="flex flex-wrap items-center gap-1.5">
                <span className="w-28 shrink-0 text-xs text-muted">{g.sido.name}</span>
                {g.regions.map((r) => {
                  const on = p.preferredSigunguCodes.includes(r.code);
                  return (
                    <button
                      key={r.code}
                      type="button"
                      aria-pressed={on}
                      onClick={() => togglePreferred(r.code)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${on ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-muted hover:text-ink'}`}
                    >
                      {regionLabel(r)} <span className="opacity-60">{r.houseCount}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            {groups.length === 0 && <p className="text-xs text-muted">아직 수집된 공고가 없어요. 어드민에서 동기화를 먼저 실행해 주세요.</p>}
          </div>
        </div>
      </Section>

      {canLocalOnly && (
        <label className="card flex items-start gap-2.5 p-4 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-brand" checked={localOnly} onChange={(e) => setLocalOnly(e.target.checked)} />
          <span>
            서버에 내 정보를 저장하지 않을래요
            <span className="block text-[11px] text-muted">생년월일만 계정에 남기고 소득·자산 등 나머지 조건은 이 브라우저에만 보관해요. 다른 기기에선 다시 입력해야 해요.</span>
          </span>
        </label>
      )}
      {(localError ?? error) && <p className="text-sm text-danger">{localError ?? error}</p>}
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? '저장 중…' : '저장하고 매칭 보기'}
        </button>
      </div>
    </form>
  );
}
