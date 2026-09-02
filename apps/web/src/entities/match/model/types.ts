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
  // matchedCodes: 이 공고에서 통과한 계층. noticeSpecific: 공고별 기준으로 판정했는지(false면 공통 규칙)
  notices: (Notice & { matchedAt?: string; matchedCodes: string[]; noticeSpecific: boolean })[];
}
