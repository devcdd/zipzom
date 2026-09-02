import { useState } from 'react';
import { fmtArea, fmtDate, fmtRent, fmtWon } from '@/shared/lib';
import { Tag } from '@/shared/ui';
import { groupLabel } from '../lib/groups';
import { PHASE } from '../lib/phase';
import { NoticeTimeline } from './NoticeTimeline';
import type { Notice } from '../model/types';

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function NoticeCard({
  notice: n,
  isNew,
  selected,
  selectedHouseId,
  bookmarked,
  highlightGroups,
  onShowMap,
  onShowHouse,
  onToggleBookmark,
}: {
  notice: Notice;
  isNew?: boolean;
  selected?: boolean;
  selectedHouseId?: number | null; // 지도에서 고른 단지 행 강조
  bookmarked?: boolean;
  highlightGroups?: string[]; // 내 매칭에서 통과한 계층 → 자격·배정 칩 강조
  onShowMap?: () => void;
  onShowHouse?: (houseId: number) => void; // 단지 행 클릭 → 지도에서 그 단지
  onToggleBookmark?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const hit = new Set(highlightGroups ?? []);
  const houses = n.houses.filter((h) => h.name || h.address);
  const shown = expanded ? houses : houses.slice(0, 3);

  return (
    <article
      id={`notice-${n.id}`}
      aria-current={selected ? 'true' : undefined}
      className={`card flex flex-col gap-3 p-5 scroll-mt-20 transition-colors ${selected ? 'card-selected' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        <Tag tone="ink">{n.institution ?? n.source}</Tag>
        {n.supplyType && <Tag>{n.supplyType}</Tag>}
        {n.houseType && <Tag>{n.houseType}</Tag>}
        <Tag tone={PHASE[n.phase].tone}>{PHASE[n.phase].label}</Tag>
        {isNew && <Tag tone="danger">NEW</Tag>}
        <NoticeTimeline notice={n} />
      </div>
      <div className="flex items-start gap-2">
        <h3 className={`min-w-0 flex-1 text-[15px] leading-snug text-balance ${selected ? 'font-bold text-brand' : 'font-semibold'}`}>
          {n.detailUrl ? (
            <a href={n.detailUrl} target="_blank" rel="noreferrer" className="hover:underline">
              {n.title}
            </a>
          ) : (
            n.title
          )}
        </h3>
        {onToggleBookmark && (
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-pressed={bookmarked}
            title={bookmarked ? '북마크 해제' : '북마크'}
            aria-label={bookmarked ? '북마크 해제' : '북마크'}
            className={`shrink-0 rounded-md border p-1.5 transition-colors ${bookmarked ? 'border-warn/40 bg-warn-soft text-warn' : 'border-line bg-surface text-muted hover:border-warn/40 hover:bg-warn-soft hover:text-warn'}`}
          >
            <StarIcon filled={!!bookmarked} />
          </button>
        )}
        {onShowMap && n.houses.some((h) => h.lat != null) && (
          <button
            type="button"
            onClick={onShowMap}
            title="지도에서 보기"
            aria-label="지도에서 보기"
            className="shrink-0 rounded-md border border-line bg-surface p-1.5 text-muted transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand"
          >
            <MapPinIcon />
          </button>
        )}
      </div>
      {houses.length > 0 && (
        <ul className="divide-y divide-line border-y border-line text-[13px]">
          {shown.map((h) => (
            <li
              key={h.id}
              onClick={onShowHouse && h.lat != null ? () => onShowHouse(h.id) : undefined}
              aria-selected={selectedHouseId === h.id || undefined}
              className={`flex flex-col gap-0.5 py-2 ${onShowHouse && h.lat != null ? 'cursor-pointer transition-colors hover:bg-surface-2/60' : ''} ${selectedHouseId === h.id ? 'house-selected' : ''}`}
            >
              {/* 단지명은 자르지 않는다. 이름 + 배정 계층이 첫 줄을 채우고 필요하면 줄바꿈 */}
              <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span className={`font-medium ${selectedHouseId === h.id ? 'text-brand' : ''}`}>{h.name ?? h.address}</span>
                {h.eligibleGroups?.map((g) => (
                  <span key={g} className={`rounded px-1 text-[10px] leading-4 ${hit.has(g) ? 'bg-brand text-white' : 'bg-surface-2 text-muted'}`}>
                    {groupLabel(g)}
                  </span>
                ))}
              </span>
              {h.address && <span className="text-muted">{h.address}</span>}
              <span className="flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="text-muted">
                  {[h.supplyCount ? `${h.supplyCount}호 모집` : h.totalHouseholds ? `${h.totalHouseholds}세대` : null, fmtArea(h.areaMin, h.areaMax)].filter(Boolean).join(' · ')}
                </span>
                <span className="ml-auto whitespace-nowrap">{fmtRent(h.minDeposit, h.minMonthlyRent) ?? <span className="text-muted">임대조건 공고문 참조</span>}</span>
              </span>
            </li>
          ))}
          {houses.length > 3 && (
            <li>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full py-2 text-left text-xs text-brand hover:bg-surface-2"
              >
                {expanded ? '접기' : `단지 ${houses.length - 3}곳 더 보기`}
              </button>
            </li>
          )}
        </ul>
      )}
      {(n.eligibility?.length ?? 0) > 0 && (
        <section className="rounded-lg border border-line bg-surface-2/40 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-semibold text-muted">지원 자격</span>
            {n.eligibility.map((e) => (
              <button
                key={e.code}
                type="button"
                aria-pressed={openGroup === e.code}
                onClick={() => setOpenGroup(openGroup === e.code ? null : e.code)}
                className={`rounded-full border px-2 py-0.5 transition-colors ${
                  hit.has(e.code) ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:border-brand/40'
                } ${openGroup === e.code ? 'ring-2 ring-brand/30' : ''}`}
              >
                {e.label}
                {e.exempt.includes('income') ? <span className="ml-1 opacity-70">소득 무관</span> : e.incomePct != null && <span className="ml-1 opacity-70">소득 {e.incomePct}%</span>}
              </button>
            ))}
          </div>
          {(() => {
            const e = n.eligibility.find((x) => x.code === openGroup);
            if (!e) return null;
            const nums = [
              e.ageMin != null || e.ageMax != null ? `나이 ${e.ageMin ?? ''}~${e.ageMax ?? ''}세` : null,
              e.exempt.includes('income') ? '소득 요건 없음' : e.incomePct != null ? `소득 ${e.incomePct}%${e.dualIncomePct != null ? ` (맞벌이 ${e.dualIncomePct}%)` : ''}` : null,
              e.exempt.includes('asset') ? '자산 요건 없음' : e.assetLimit != null ? `총자산 ${fmtWon(e.assetLimit)}` : null,
              e.exempt.includes('car') ? '자동차 요건 없음' : e.carLimit != null ? `자동차 ${e.carLimit === 0 ? '소유 불가' : fmtWon(e.carLimit)}` : null,
            ].filter(Boolean);
            return (
              <div className="mt-2 space-y-1 text-muted">
                {nums.length > 0 && <p>{nums.join(' · ')}</p>}
                {e.conditions.length > 0 && (
                  <ul className="list-disc pl-4">
                    {e.conditions.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px]">공고문 기준 요약. 최종 자격은 원문으로 확인하세요.</p>
              </div>
            );
          })()}
        </section>
      )}
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <div>
          <dt className="inline">공고 </dt>
          <dd className="inline text-ink">{fmtDate(n.postedOn)}</dd>
        </div>
        {n.applyBeginOn && (
          <div>
            <dt className="inline">접수 </dt>
            <dd className="inline text-ink">
              {fmtDate(n.applyBeginOn)} ~ {fmtDate(n.applyEndOn)}
            </dd>
          </div>
        )}
        {n.winnerAnnounceOn && (
          <div>
            <dt className="inline">발표 </dt>
            <dd className="inline text-ink">{n.winnerAnnounceOn.slice(2).replace(/-/g, '.')}</dd>
          </div>
        )}
        {n.contact && (
          <div className="max-w-full truncate">
            <dt className="inline">문의 </dt>
            <dd className="inline text-ink">{n.contact}</dd>
          </div>
        )}
        {n.detailUrl && (
          <a href={n.detailUrl} target="_blank" rel="noreferrer" className="ml-auto text-brand hover:underline">
            원문 공고 ↗
          </a>
        )}
      </dl>
    </article>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.5l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  );
}
