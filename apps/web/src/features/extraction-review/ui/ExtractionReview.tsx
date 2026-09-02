import { useState } from 'react';
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

type HouseCol = { key: keyof ExtractedHouse; label: string; num?: boolean };
// SH는 단지 표 전체를 교체하고, LH는 마이홈 단지가 이미 있어 이름·배정만 맞춘다
const SH_COLS: HouseCol[] = [
  { key: 'name', label: '단지명' },
  { key: 'address', label: '주소' },
  { key: 'supplyCount', label: '공급호수', num: true },
  { key: 'totalHouseholds', label: '총세대', num: true },
  { key: 'minDeposit', label: '최저 보증금(원)', num: true },
  { key: 'minMonthlyRent', label: '최저 월세(원)', num: true },
];
const LH_COLS: HouseCol[] = [
  { key: 'name', label: '단지명 (마이홈 단지명과 부분일치로 매칭)' },
  { key: 'supplyCount', label: '공급호수', num: true },
];

type EligCol = { key: keyof ExtractedEligibility; label: string; num?: boolean; width: string };
const ELIG_COLS: EligCol[] = [
  { key: 'label', label: '공고 표기', width: 'min-w-32' },
  { key: 'ageMin', label: '나이≥', num: true, width: 'w-16' },
  { key: 'ageMax', label: '나이≤', num: true, width: 'w-16' },
  { key: 'incomePct', label: '소득%', num: true, width: 'w-16' },
  { key: 'dualIncomePct', label: '맞벌이%', num: true, width: 'w-16' },
  { key: 'assetLimit', label: '총자산(원)', num: true, width: 'w-32' },
  { key: 'carLimit', label: '자동차(원)', num: true, width: 'w-28' },
];

const EMPTY_HOUSE: ExtractedHouse = { name: '', address: null, supplyCount: null, totalHouseholds: null, minDeposit: null, minMonthlyRent: null, groups: [] };
const EMPTY_ELIG: ExtractedEligibility = { code: 'OTHER', label: '', ageMin: null, ageMax: null, incomePct: null, dualIncomePct: null, assetLimit: null, carLimit: null, exempt: [], conditions: [] };
const EXEMPT: { key: string; label: string }[] = [
  { key: 'income', label: '소득 배제' },
  { key: 'asset', label: '자산 배제' },
  { key: 'car', label: '자동차 배제' },
];

const numOrNull = (raw: string) => (raw === '' ? null : Number(raw));

/** 원문 PDF 옆에서 자격 기준·단지 표를 셀 단위로 고쳐 승인. 승인 전엔 아무것도 반영되지 않는다 */
function ExtractionCard({ item, onChanged }: { item: Extraction; onChanged: () => void }) {
  const [houses, setHouses] = useState<ExtractedHouse[]>(item.houses ?? []);
  const [elig, setElig] = useState<ExtractedEligibility[]>(item.eligibility ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = item.status === 'PENDING';
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
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Tag tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Tag>
            <Tag tone="ink">{item.source}</Tag>
            <span className="text-xs text-muted">
              #{item.noticeId} · {item.model ?? '—'}
            </span>
          </div>
          <h2 className="mt-1 truncate text-sm font-semibold">{item.title}</h2>
          <div className="mt-1 flex gap-3 text-xs">
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
        <div className="flex gap-1.5">
          {editable && (
            <>
              <button type="button" className="btn-ghost px-2.5 py-1 text-xs" disabled={busy} onClick={() => run(() => extractionApi.reject(item.noticeId))}>
                반려
              </button>
              <button type="button" className="btn-primary px-2.5 py-1 text-xs" disabled={busy || !canApprove} onClick={() => run(() => extractionApi.approve(item.noticeId, houses, elig))}>
                {busy ? '반영 중…' : `승인 · 자격 ${elig.length}계층 · 단지 ${houses.length}`}
              </button>
            </>
          )}
          {item.status !== 'APPROVED' && (
            <button type="button" className="btn-ghost px-2.5 py-1 text-xs" disabled={busy} onClick={() => run(() => extractionApi.retry(item.noticeId))}>
              {busy ? '추출 중…' : '다시 추출'}
            </button>
          )}
        </div>
      </div>
      {item.error && <p className="mt-2 font-mono text-xs text-danger">{item.error}</p>}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {(elig.length > 0 || editable) && (
        <section className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted">입주자격 (공고 × 계층)</h3>
            {editable && (
              <button type="button" className="btn-ghost px-2 py-0.5 text-[11px]" disabled={busy} onClick={() => setElig((es) => [...es, EMPTY_ELIG])}>
                계층 추가
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
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
                        {editable ? (
                          <input
                            className={`field px-2 py-1 ${c.width} ${c.num ? 'text-right' : ''}`}
                            type={c.num ? 'number' : 'text'}
                            value={(e[c.key] as string | number | null) ?? ''}
                            onChange={(ev) => setEl(i, c.key, c.num ? numOrNull(ev.target.value) : ev.target.value)}
                          />
                        ) : (
                          <span className={c.num ? 'block text-right tabular-nums' : ''}>{(e[c.key] as string | number | null)?.toLocaleString('ko-KR') ?? '—'}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-1 py-1">
                      <div className="flex flex-col gap-0.5">
                        {EXEMPT.map((x) => {
                          const on = e.exempt.includes(x.key);
                          if (!editable && !on) return null;
                          return (
                            <button
                              key={x.key}
                              type="button"
                              disabled={!editable}
                              aria-pressed={on}
                              onClick={() => setEl(i, 'exempt', on ? e.exempt.filter((k) => k !== x.key) : [...e.exempt, x.key])}
                              className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] ${on ? 'border-warn bg-warn-soft text-warn' : 'border-line text-muted hover:text-ink'}`}
                            >
                              {x.label}
                            </button>
                          );
                        })}
                        {!editable && e.exempt.length === 0 && <span className="text-xs text-muted">—</span>}
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      {editable ? (
                        <textarea
                          className="field min-w-64 px-2 py-1 text-xs"
                          rows={Math.max(2, e.conditions.length)}
                          value={e.conditions.join('\n')}
                          onChange={(ev) => setEl(i, 'conditions', ev.target.value.split('\n').map((l) => l.trim()).filter(Boolean))}
                        />
                      ) : (
                        <ul className="list-disc pl-4 text-xs text-muted">
                          {e.conditions.map((c, k) => (
                            <li key={k}>{c}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    {editable && (
                      <td className="px-1 text-center">
                        <button type="button" className="text-muted hover:text-danger" title="삭제" onClick={() => setElig((es) => es.filter((_, j) => j !== i))}>
                          ×
                        </button>
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
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted">단지별 배정 계층{item.source !== 'SH' && ' · 단지 정보는 마이홈 값 유지, 배정 계층만 반영'}</h3>
            {editable && (
              <button type="button" className="btn-ghost px-2 py-0.5 text-[11px]" disabled={busy} onClick={() => setHouses((hs) => [...hs, EMPTY_HOUSE])}>
                단지 추가
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
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
                        {editable ? (
                          <input
                            className={`field px-2 py-1 ${c.num ? 'w-24 text-right' : c.key === 'address' ? 'min-w-64' : 'min-w-40'}`}
                            type={c.num ? 'number' : 'text'}
                            value={(h[c.key] as string | number | null) ?? ''}
                            onChange={(ev) => setHouse(i, c.key, ev.target.value, c.num)}
                          />
                        ) : (
                          <span className={c.num ? 'block text-right tabular-nums' : ''}>{(h[c.key] as string | number | null)?.toLocaleString('ko-KR') ?? '—'}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-1 py-1">
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
                              onClick={() => toggleGroup(i, code)}
                              className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted hover:text-ink'}`}
                            >
                              {groupLabel(code)}
                            </button>
                          );
                        })}
                        {!editable && h.groups.length === 0 && <span className="text-xs text-muted">—</span>}
                      </div>
                    </td>
                    {editable && (
                      <td className="px-1 text-center">
                        <button type="button" className="text-muted hover:text-danger" title="행 삭제" onClick={() => setHouses((hs) => hs.filter((_, j) => j !== i))}>
                          ×
                        </button>
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

export function ExtractionReview() {
  const list = useAsync(() => extractionApi.list(), []);
  return (
    <PageState loading={list.loading && !list.data} error={list.error} empty={list.data?.length === 0} emptyMessage="추출된 공고가 없어요. 동기화 후 SH·LH 공고가 들어오면 여기 쌓여요.">
      <div className="flex flex-col gap-3">
        {list.data?.map((item) => (
          <ExtractionCard key={`${item.noticeId}-${item.status}-${item.createdAt}`} item={item} onChanged={list.reload} />
        ))}
      </div>
    </PageState>
  );
}
