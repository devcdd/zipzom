import type { ReactNode } from 'react';

export type TagTone = 'ink' | 'muted' | 'brand' | 'warn' | 'danger';

const TONE: Record<TagTone, string> = {
  ink: 'bg-ink text-white',
  muted: 'bg-surface-2 text-muted',
  brand: 'bg-brand-soft text-brand',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
};

export function Tag({ tone = 'muted', children, className = '' }: { tone?: TagTone; children: ReactNode; className?: string }) {
  return <span className={`tag ${TONE[tone]} ${className}`}>{children}</span>;
}
