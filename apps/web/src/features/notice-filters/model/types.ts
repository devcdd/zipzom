import type { Phase } from '@/entities/notice';

export type PhaseFilter = 'active' | 'open' | 'upcoming' | 'closed';

export interface NoticeFilters {
  phase: PhaseFilter;
  regions: string[]; // [] = 전체, 'XX000' = 시도 전체, 5자리 = 시군구
  q: string;
}

export const DEFAULT_FILTERS: NoticeFilters = { phase: 'active', regions: [], q: '' };

export const PHASE_OPTIONS: { value: PhaseFilter; label: string }[] = [
  { value: 'active', label: '모집 중·예정' },
  { value: 'open', label: '접수중' },
  { value: 'upcoming', label: '접수 예정' },
  { value: 'closed', label: '마감' },
];

export const phaseParam = (p: PhaseFilter): Phase[] => (p === 'active' ? ['open', 'upcoming'] : [p]);
