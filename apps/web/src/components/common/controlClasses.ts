import { cn } from '@/utils/cn';

export const controlClasses = cn(
  'w-full rounded-control border border-line bg-surface px-3 text-[0.9375rem] text-ink',
  'placeholder:text-subtle transition-[border-color,box-shadow] duration-150',
  'hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10',
  'disabled:cursor-not-allowed disabled:bg-fill disabled:text-muted',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10',
);
