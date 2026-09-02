import type { Notice } from '@/entities/notice';

export interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

export interface Evaluation {
  code: string;
  label: string;
  ok: boolean;
  checks: Check[];
}

export interface MatchResult {
  eligible: boolean;
  evaluations: Evaluation[];
  notices: (Notice & { matchedAt?: string })[];
}
