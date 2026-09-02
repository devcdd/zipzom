import { useState } from 'react';
import { fmtDate, fmtRent } from '@/shared/lib';
import { Tag } from '@/shared/ui';
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
  bookmarked,
  onShowMap,
  onToggleBookmark,
}: {
  notice: Notice;
  isNew?: boolean;
  selected?: boolean;
  bookmarked?: boolean;
  onShowMap?: () => void;
  onToggleBookmark?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
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
        <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-balance">
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
        <ul className="divide-y divide-line rounded-lg border border-line text-[13px]">
          {shown.map((h) => (
            <li key={h.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 px-3 py-2">
              <span className="truncate font-medium">{h.name ?? h.address}</span>
              <span className="whitespace-nowrap text-right text-muted">
                {h.supplyCount ? `${h.supplyCount}호` : h.totalHouseholds ? `${h.totalHouseholds}세대` : ''}
              </span>
              <span className="truncate text-muted">{h.address ?? ''}</span>
              <span className="whitespace-nowrap text-right">
                {fmtRent(h.minDeposit, h.minMonthlyRent) ?? <span className="text-muted">임대조건 공고문 참조</span>}
              </span>
            </li>
          ))}
          {houses.length > 3 && (
            <li>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full px-3 py-2 text-left text-xs text-brand hover:bg-surface-2"
              >
                {expanded ? '접기' : `단지 ${houses.length - 3}곳 더 보기`}
              </button>
            </li>
          )}
        </ul>
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
