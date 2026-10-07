import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-line bg-surface shadow-raised', className)}
      {...rest}
    />
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-b border-line px-5 py-3.5',
        className,
      )}
    >
      <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
      {action}
    </div>
  );
}
