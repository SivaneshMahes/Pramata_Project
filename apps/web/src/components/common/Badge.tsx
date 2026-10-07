import type { ReactNode } from 'react';
import type { Tone } from '@/constants/labels';
import { cn } from '@/utils/cn';

const TONES: Record<Tone, string> = {
  neutral: 'bg-fill text-slate-700',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-amber-700',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
