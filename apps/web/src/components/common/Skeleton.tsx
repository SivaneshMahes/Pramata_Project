import { cn } from '@/utils/cn';

/** Placeholder shaped like the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse rounded-md bg-slate-200/70 motion-reduce:animate-none',
        className,
      )}
    />
  );
}

export function LoadingSkeleton({
  rows = 3,
  label = 'Loading',
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-card border border-line bg-surface p-4"
        >
          <Skeleton className="size-14 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-8 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}
