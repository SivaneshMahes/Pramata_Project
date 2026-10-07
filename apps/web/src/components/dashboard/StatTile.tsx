import type { ReactNode } from 'react';
import { Card } from '../common/Card';
import { Skeleton } from '../common/Skeleton';

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}

/** label · value · optional context. Large values use proportional figures. */
export function StatTile({ label, value, hint, icon }: StatTileProps) {
  return (
    <Card className="flex flex-col gap-1 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        {icon && <span className="text-subtle [&>svg]:size-4">{icon}</span>}
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function StatTileSkeleton() {
  return (
    <Card className="flex flex-col gap-2.5 p-4 sm:p-5">
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-7 w-24" />
    </Card>
  );
}
