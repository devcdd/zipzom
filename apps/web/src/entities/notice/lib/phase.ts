import type { TagTone } from '@/shared/ui';
import type { Phase } from '../model/types';

export const PHASE: Record<Phase, { label: string; tone: TagTone }> = {
  open: { label: '접수중', tone: 'brand' },
  upcoming: { label: '접수 예정', tone: 'warn' },
  closed: { label: '마감', tone: 'muted' },
};
