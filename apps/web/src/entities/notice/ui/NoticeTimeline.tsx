import { dday, fmtDate } from '@/shared/lib';
import type { Notice } from '../model/types';

type State = 'done' | 'current' | 'next' | 'future';

const DOT: Record<State, string> = {
  done: 'size-1.5 bg-brand',
  current: 'size-2 bg-brand ring-2 ring-brand/25',
  next: 'size-2 border-[1.5px] border-brand bg-surface', // 다음 단계, 아직 시작 전
  future: 'size-1.5 bg-line',
};

/** 공고 → 접수 → 발표 진행도. 점 3개 + 현재 단계 D-day 한 줄, 날짜는 title로. */
export function NoticeTimeline({ notice: n }: { notice: Notice }) {
  const announceDday = dday(n.winnerAnnounceOn);
  const announced = !!n.winnerAnnounceOn && announceDday === null; // 발표일 지남
  const states: State[] = [
    'done',
    n.phase === 'closed' ? 'done' : n.phase === 'open' ? 'current' : 'next',
    n.phase !== 'closed' ? 'future' : announced ? 'done' : 'next',
  ];
  // 접수 예정은 시작까지, 접수중은 마감까지, 마감 후엔 발표까지
  const text =
    n.phase === 'upcoming' ? `접수 ${dday(n.applyBeginOn) ?? ''}`
    : n.phase === 'open' ? `마감 ${dday(n.applyEndOn) ?? ''}`
    : announced ? '발표 완료'
    : `발표 ${announceDday ?? '미정'}`;
  const title = [
    `공고 ${fmtDate(n.postedOn)}`,
    n.applyBeginOn && `접수 ${fmtDate(n.applyBeginOn)} ~ ${fmtDate(n.applyEndOn)}`,
    n.winnerAnnounceOn && `발표 ${n.winnerAnnounceOn.slice(2).replace(/-/g, '.')}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <span className="ml-auto flex shrink-0 items-center gap-2 text-xs" title={title}>
      <span className="flex items-center">
        {states.map((s, i) => (
          <span key={i} className="flex items-center">
            {i > 0 && <span className={`h-px w-2.5 ${s === 'done' || s === 'current' ? 'bg-brand' : 'bg-line'}`} />}
            <span className={`rounded-full ${DOT[s]}`} />
          </span>
        ))}
      </span>
      <span className={`whitespace-nowrap font-semibold ${n.phase === 'closed' && announced ? 'text-muted' : 'text-brand'}`}>{text.trim()}</span>
    </span>
  );
}
