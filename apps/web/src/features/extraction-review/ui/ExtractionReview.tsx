import { useEffect, useState } from 'react';
import { GROUP_CODES, groupLabel } from '@/entities/notice';
import { useAsync } from '@/shared/lib';
import { PageState, Tag, type TagTone } from '@/shared/ui';
import { extractionApi, type ExtractedEligibility, type ExtractedHouse, type Extraction } from '../api/extractionApi';

const STATUS: Record<Extraction['status'], { label: string; tone: TagTone }> = {
  PENDING: { label: '검수 대기', tone: 'warn' },
  APPROVED: { label: '승인', tone: 'brand' },
  REJECTED: { label: '반려', tone: 'muted' },
  FAILED: { label: '추출 실패', tone: 'danger' },
};

type HouseCol = { key: keyof ExtractedHouse; label: string; num?: boolean; width: string };
// SH는 단지 표 전체를 교체하고, LH는 마이홈 단지가 이미 있어 이름·배정만 맞춘다
const SH_COLS: HouseCol[] = [
  { key: 'name', label: '단지명', width: 'min-w-40' },
  { key: 'address', label: '주소', width: 'min-w-64' },
  { key: 'supplyCount', label: '공급호수', num: true, width: 'w-24' },
  { key: 'totalHouseholds', label: '총세대', num: true, width: 'w-24' },
  { key: 'minDeposit', label: '최저 보증금(원)', num: true, width: 'w-24' },
  { key: 'minMonthlyRent', label: '최저 월세(원)', num: true, width: 'w-24' },
  { key: 'areaMin', label: '면적 최소(㎡)', num: true, width: 'w-24' },
  { key: 'areaMax', label: '면적 최대(㎡)', num: true, width: 'w-24' },
];
const LH_COLS: HouseCol[] = [
  { key: 'name', label: '단지명 (마이홈 단지명과 부분일치로 매칭)', width: 'min-w-40' },
  { key: 'supplyCount', label: '공급호수', num: true, width: 'w-24' },
];

type EligCol = { key: keyof ExtractedEligibility; label: string; num?: boolean; width: string; manwon?: boolean };
const ELIG_COLS: EligCol[] = [
  { key: 'label', label: '공고 표기', width: 'min-w-32' },
  { key: 'ageMin', label: '나이≥', num: true, width: 'w-16' },
  { key: 'ageMax', label: '나이≤', num: true, width: 'w-16' },
  { key: 'incomePct', label: '소득%', num: true, width: 'w-16' },
  { key: 'dualIncomePct', label: '맞벌이%', num: true, width: 'w-16' },
  // DB는 원, 화면은 만원 (공고문 표기 단위)
  { key: 'assetLimit', label: '총자산(만원)', num: true, width: 'w-24', manwon: true },
  { key: 'carLimit', label: '자동차(만원)', num: true, width: 'w-24', manwon: true },
];

const EMPTY_HOUSE: ExtractedHouse = { name: '', address: null, supplyCount: null, totalHouseholds: null, minDeposit: null, minMonthlyRent: null, areaMin: null, areaMax: null, groups: [] };
const EMPTY_ELIG: ExtractedEligibility = { code: 'OTHER', label: '', ageMin: null, ageMax: null, incomePct: null, dualIncomePct: null, assetLimit: null, carLimit: null, exempt: [], conditions: [] };
const EXEMPT: { key: string; label: string }[] = [
  { key: 'income', label: '소득 배제' },
  { key: 'asset', label: '자산 배제' },
  { key: 'car', label: '자동차 배제' },
];

const numOrNull = (raw: string) => (raw === '' ? null : Number(raw));
const fmtTs = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * 셀 하나. 데스크톱 표와 모바일 카드가 같은 입력을 쓰도록 분리했다. width는 표에선 열 폭, 카드에선 w-full.
 */
function EligCell({ col, e, editable, width, onChange }: { col: EligCol; e: ExtractedEligibility; editable: boolean; width: string; onChange: (v: unknown) => void }) {
  const raw = e[col.key] as string | number | null;
  if (!editable)
    return (
      <span className={col.num ? 'block text-right tabular-nums' : ''}>
        {col.manwon && raw != null ? `${Math.round((raw as number) / 10_000).toLocaleString('ko-KR')}만` : (raw?.toLocaleString('ko-KR') ?? '—')}
      </span>
    );
  return (
    <input
      className={`field px-2 py-1 ${width} ${col.num ? 'text-right' : ''}`}
      type={col.num ? 'number' : 'text'}
      value={col.manwon && raw != null ? Math.round((raw as number) / 10_000) : (raw ?? '')}
      onChange={(ev) => {
        const v = col.num ? numOrNull(ev.target.value) : ev.target.value;
        onChange(col.manwon && typeof v === 'number' ? v * 10_000 : v);
      }}
    />
  );
}

function HouseCell({ col, h, editable, width, onChange }: { col: HouseCol; h: ExtractedHouse; editable: boolean; width: string; onChange: (raw: string) => void }) {
  const raw = h[col.key] as string | number | null;
  if (!editable) return <span className={col.num ? 'block text-right tabular-nums' : ''}>{raw?.toLocaleString('ko-KR') ?? '—'}</span>;
  return <input className={`field px-2 py-1 ${width} ${col.num ? 'text-right' : ''}`} type={col.num ? 'number' : 'text'} value={raw ?? ''} onChange={(ev) => onChange(ev.target.value)} />;
}

function ExemptToggles({ e, editable, stack, onChange }: { e: ExtractedEligibility; editable: boolean; stack?: boolean; onChange: (next: string[]) => void }) {
  return (
    <div className={stack ? 'flex flex-col gap-0.5' : 'flex flex-wrap gap-1'}>
      {EXEMPT.map((x) => {
        const on = e.exempt.includes(x.key);
        if (!editable && !on) return null;
        return (
          <button
            key={x.key}
            type="button"
            disabled={!editable}
            aria-pressed={on}
            onClick={() => onChange(on ? e.exempt.filter((k) => k !== x.key) : [...e.exempt, x.key])}
            className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-2xs ${on ? 'border-warn bg-warn-soft text-warn' : 'border-line text-muted hover:text-ink'}`}
          >
            {x.label}
          </button>
        );
      })}
      {!editable && e.exempt.length === 0 && <span className="text-xs text-muted">—</span>}
    </div>
  );
}

function ConditionsField({ e, editable, width, onChange }: { e: ExtractedEligibility; editable: boolean; width: string; onChange: (next: string[]) => void }) {
  if (!editable)
    return (
      <ul className="list-disc pl-4 text-xs text-muted">
        {e.conditions.map((c, k) => (
          <li key={k}>{c}</li>
        ))}
      </ul>
    );
  return (
    <textarea
      className={`field px-2 py-1 text-xs ${width}`}
      rows={Math.max(2, e.conditions.length)}
      value={e.conditions.join('\n')}
      onChange={(ev) => onChange(ev.target.value.split('\n').map((l) => l.trim()).filter(Boolean))}
    />
  );
}

function GroupChips({ h, editable, onToggle }: { h: ExtractedHouse; editable: boolean; onToggle: (code: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {GROUP_CODES.map((code) => {
        const on = h.groups.some((g) => g.code === code);
        if (!editable && !on) return null;
        return (
          <button
            key={code}
            type="button"
            disabled={!editable}
            aria-pressed={on}
            onClick={() => onToggle(code)}
            className={`rounded-full border px-2 py-0.5 text-2xs ${on ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted hover:text-ink'}`}
          >
            {groupLabel(code)}
          </button>
        );
      })}
      {!editable && h.groups.length === 0 && <span className="text-xs text-muted">—</span>}
    </div>
  );
}

function RemoveButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button type="button" className="shrink-0 px-1 text-muted hover:text-danger" title={title} aria-label={title} onClick={onClick}>
      ×
    </button>
  );
}

/** 원문 PDF 옆에서 자격 기준·단지 표를 셀 단위로 고쳐 승인. 승인 전엔 아무것도 반영되지 않는다 */
function ExtractionCard({ item, onChanged, queued }: { item: Extraction; onChanged: () => void; queued?: boolean }) {
  // 스키마 확장 전에 저장된 행은 groups·exempt·conditions가 없다
  const [houses, setHouses] = useState<ExtractedHouse[]>((item.houses ?? []).map((h) => ({ ...h, groups: h.groups ?? [], areaMin: h.areaMin ?? null, areaMax: h.areaMax ?? null })));
  const [elig, setElig] = useState<ExtractedEligibility[]>((item.eligibility ?? []).map((e) => ({ ...e, exempt: e.exempt ?? [], conditions: e.conditions ?? [] })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 승인·반려 뒤에도 고쳐서 다시 반영할 수 있다. 실패 건은 추출 결과가 없으니 재추출만
  const editable = item.status !== 'FAILED';
  const pending = item.status === 'PENDING';
  const cols = item.source === 'SH' ? SH_COLS : LH_COLS;

  const setHouse = (i: number, key: keyof ExtractedHouse, raw: string, num?: boolean) =>
    setHouses((hs) => hs.map((h, j) => (j === i ? { ...h, [key]: num ? numOrNull(raw) : raw || null } : h)));
  const toggleGroup = (i: number, code: string) =>
    setHouses((hs) =>
      hs.map((h, j) => {
        if (j !== i) return h;
        const has = h.groups.some((g) => g.code === code);
        return { ...h, groups: has ? h.groups.filter((g) => g.code !== code) : [...h.groups, { code, supplyCount: null }] };
      }),
    );
  const setEl = (i: number, key: keyof ExtractedEligibility, value: unknown) => setElig((es) => es.map((e, j) => (j === i ? { ...e, [key]: value } : e)));
  const removeElig = (i: number) => setElig((es) => es.filter((_, j) => j !== i));
  const removeHouse = (i: number) => setHouses((hs) => hs.filter((_, j) => j !== i));

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const canApprove = houses.every((h) => h.name.trim()) && elig.every((e) => e.label.trim()) && (houses.length > 0 || elig.length > 0);

  return (
    <div className="card p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Tag tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Tag>
            <Tag tone="ink">{item.source}</Tag>
            <span className="text-xs text-muted">
              #{item.noticeId} · {item.model ?? '—'} · 추출 {fmtTs(item.createdAt)}
              {item.reviewedAt && ` · ${item.status === 'REJECTED' ? '반려' : '승인'} ${fmtTs(item.reviewedAt)}`}
            </span>
          </div>
          <h2 className="mt-1 line-clamp-2 text-sm font-semibold sm:truncate">{item.title}</h2>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <a href={item.pdfUrl} target="_blank" rel="noreferrer" className="text-brand underline">
              공고문 PDF{item.pdfName && ` · ${item.pdfName}`}
            </a>
            {item.detailUrl && (
              <a href={item.detailUrl} target="_blank" rel="noreferrer" className="text-muted underline">
                공고 페이지
              </a>
            )}
          </div>
        </div>
        {/* 모바일에선 버튼이 한 줄을 나눠 갖는다 */}
        <div className="flex shrink-0 gap-1.5">
          {pending && (
            <button type="button" className="btn-ghost flex-1 justify-center px-2.5 py-1 text-xs sm:flex-none" disabled={busy} onClick={() => run(() => extractionApi.reject(item.noticeId))}>
              반려
            </button>
          )}
          {editable && (
            <button
              type="button"
              className="btn-primary flex-1 justify-center px-2.5 py-1 text-xs sm:flex-none"
              disabled={busy || !canApprove}
              onClick={() => run(() => extractionApi.approve(item.noticeId, houses, elig))}
            >
              {busy ? (
                '반영 중…'
              ) : (
                <>
                  {pending ? '승인' : '수정 반영'}
                  <span className="hidden sm:inline">
                    {' '}
                    · 자격 {elig.length}계층 · 단지 {houses.length}
                  </span>
                </>
              )}
            </button>
          )}
          {/* 승인된 건도 재추출 가능. 결과는 검수 대기로 돌아가고, 승인 전까지 기존 반영값은 유지된다 */}
          <button
            type="button"
            className="btn-ghost flex-1 justify-center whitespace-nowrap px-2.5 py-1 text-xs sm:flex-none"
            disabled={busy}
            onClick={() => {
              if (item.status === 'APPROVED' && !confirm('다시 추출하면 검수 대기로 돌아갑니다. 이미 반영된 값은 다시 승인하기 전까지 유지돼요.')) return;
              void run(() => extractionApi.retry(item.noticeId));
            }}
          >
            {queued ? '추출 대기 중…' : '다시 추출'}
          </button>
        </div>
      </div>
      {item.error && <p className="mt-2 font-mono text-xs break-all text-danger">{item.error}</p>}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {(elig.length > 0 || editable) && (
        <section className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted">입주자격 (공고 × 계층)</h3>
            {editable && (
              <button type="button" className="btn-ghost px-2 py-0.5 text-2xs" disabled={busy} onClick={() => setElig((es) => [...es, EMPTY_ELIG])}>
                계층 추가
              </button>
            )}
          </div>

          {/* 모바일: 행 하나를 카드로. 가로 스크롤하며 셀을 채우는 건 손가락으로 거의 불가능하다 */}
          <div className="flex flex-col gap-2 md:hidden">
            {elig.map((e, i) => (
              <div key={i} className="rounded-lg border border-line p-2.5">
                <div className="flex items-center gap-2">
                  {editable ? (
                    <select className="field px-2 py-1 text-xs" value={e.code} onChange={(ev) => setEl(i, 'code', ev.target.value)}>
                      {GROUP_CODES.map((c) => (
                        <option key={c} value={c}>
                          {groupLabel(c)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Tag tone="brand">{groupLabel(e.code)}</Tag>
                  )}
                  {editable && <RemoveButton title="계층 삭제" onClick={() => removeElig(i)} />}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {ELIG_COLS.map((c) => (
                    <label key={c.key} className={c.num ? '' : 'col-span-2'}>
                      <span className="label">{c.label}</span>
                      <EligCell col={c} e={e} editable={editable} width="w-full" onChange={(v) => setEl(i, c.key, v)} />
                    </label>
                  ))}
                </div>
                <div className="mt-2">
                  <span className="label">배제</span>
                  <ExemptToggles e={e} editable={editable} onChange={(next) => setEl(i, 'exempt', next)} />
                </div>
                <div className="mt-2">
                  <span className="label">조건 (줄바꿈 구분)</span>
                  <ConditionsField e={e} editable={editable} width="w-full" onChange={(next) => setEl(i, 'conditions', next)} />
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr>
                  <th className="px-2 py-1.5 font-medium">계층</th>
                  {ELIG_COLS.map((c) => (
                    <th key={c.key} className="px-2 py-1.5 font-medium">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 font-medium">배제</th>
                  <th className="px-2 py-1.5 font-medium">조건 (줄바꿈 구분)</th>
                  {editable && <th className="w-8" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {elig.map((e, i) => (
                  <tr key={i} className="align-top">
                    <td className="px-1 py-1">
                      {editable ? (
                        <select className="field w-28 px-2 py-1" value={e.code} onChange={(ev) => setEl(i, 'code', ev.target.value)}>
                          {GROUP_CODES.map((c) => (
                            <option key={c} value={c}>
                              {groupLabel(c)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Tag tone="brand">{groupLabel(e.code)}</Tag>
                      )}
                    </td>
                    {ELIG_COLS.map((c) => (
                      <td key={c.key} className="px-1 py-1">
                        <EligCell col={c} e={e} editable={editable} width={c.width} onChange={(v) => setEl(i, c.key, v)} />
                      </td>
                    ))}
                    <td className="px-1 py-1">
                      <ExemptToggles e={e} editable={editable} stack onChange={(next) => setEl(i, 'exempt', next)} />
                    </td>
                    <td className="px-1 py-1">
                      <ConditionsField e={e} editable={editable} width="min-w-64" onChange={(next) => setEl(i, 'conditions', next)} />
                    </td>
                    {editable && (
                      <td className="px-1 text-center">
                        <RemoveButton title="계층 삭제" onClick={() => removeElig(i)} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(houses.length > 0 || editable) && (
        <section className="mt-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-muted">단지별 배정 계층{item.source !== 'SH' && ' · 단지 정보는 마이홈 값 유지, 배정 계층만 반영'}</h3>
            {editable && (
              <button type="button" className="btn-ghost shrink-0 px-2 py-0.5 text-2xs" disabled={busy} onClick={() => setHouses((hs) => [...hs, EMPTY_HOUSE])}>
                단지 추가
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 md:hidden">
            {houses.map((h, i) => (
              <div key={i} className="rounded-lg border border-line p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  {cols.map((c) => (
                    <label key={c.key} className={c.num ? '' : 'col-span-2'}>
                      <span className="label">{c.label}</span>
                      <HouseCell col={c} h={h} editable={editable} width="w-full" onChange={(raw) => setHouse(i, c.key, raw, c.num)} />
                    </label>
                  ))}
                </div>
                <div className="mt-2">
                  <span className="label">배정 계층</span>
                  <GroupChips h={h} editable={editable} onToggle={(code) => toggleGroup(i, code)} />
                </div>
                {editable && (
                  <div className="mt-2 text-right">
                    <RemoveButton title="단지 삭제" onClick={() => removeHouse(i)} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr>
                  {cols.map((c) => (
                    <th key={c.key} className="px-2 py-1.5 font-medium">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 font-medium">배정 계층</th>
                  {editable && <th className="w-8" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {houses.map((h, i) => (
                  <tr key={i} className="align-top">
                    {cols.map((c) => (
                      <td key={c.key} className="px-1 py-1">
                        <HouseCell col={c} h={h} editable={editable} width={c.width} onChange={(raw) => setHouse(i, c.key, raw, c.num)} />
                      </td>
                    ))}
                    <td className="px-1 py-1">
                      <GroupChips h={h} editable={editable} onToggle={(code) => toggleGroup(i, code)} />
                    </td>
                    {editable && (
                      <td className="px-1 text-center">
                        <RemoveButton title="단지 삭제" onClick={() => removeHouse(i)} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

const LIMIT = 20;
const FILTERS: { key: Extraction['status'] | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'PENDING', label: '검수 대기' },
  { key: 'APPROVED', label: '승인' },
  { key: 'REJECTED', label: '반려' },
  { key: 'FAILED', label: '실패' },
];

export function ExtractionReview() {
  const [status, setStatus] = useState<Extraction['status'] | 'ALL'>('ALL');
  const [offset, setOffset] = useState(0);
  const list = useAsync(() => extractionApi.list({ status: status === 'ALL' ? undefined : status, limit: LIMIT, offset }), [status, offset]);
  // 추출은 서버 큐에서 백그라운드로 돈다. 새로고침해도 이 폴링이 진행 상황을 다시 붙잡는다
  const queue = useAsync(() => extractionApi.queue(), []);
  const total = list.data?.total ?? 0;

  useEffect(() => {
    if (!queue.data?.running) return;
    const t = setTimeout(() => {
      queue.reload();
      list.reload();
    }, 5000);
    return () => clearTimeout(t);
  }, [queue.data, queue, list]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto rounded-md bg-surface-2 p-0.5 text-xs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setStatus(f.key);
                setOffset(0);
              }}
              className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1 font-medium transition-colors ${status === f.key ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted">
          {queue.data?.running && <span>추출 중… {queue.data.current ? `#${queue.data.current}` : ''} 남은 {queue.data.queued}건</span>}
          {list.data && (
            <span>
              {total === 0 ? 0 : offset + 1}–{Math.min(offset + LIMIT, total)} / {total}
            </span>
          )}
        </div>
      </div>
      <PageState loading={list.loading && !list.data} error={list.error} empty={list.data?.items.length === 0} emptyMessage="해당 상태의 추출이 없어요. '추출 대상' 탭에서 공고를 골라 추출하면 여기 쌓여요.">
        <div className="flex flex-col gap-3">
          {list.data?.items.map((item) => (
            <ExtractionCard
              key={`${item.noticeId}-${item.status}-${item.createdAt}`}
              item={item}
              onChanged={list.reload}
              queued={queue.data?.current === item.noticeId}
            />
          ))}
        </div>
      </PageState>
      {total > LIMIT && (
        <div className="flex justify-end gap-1">
          <button type="button" className="btn-ghost px-2.5 py-1 text-xs" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
            이전
          </button>
          <button type="button" className="btn-ghost px-2.5 py-1 text-xs" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>
            다음
          </button>
        </div>
      )}
    </div>
  );
}
