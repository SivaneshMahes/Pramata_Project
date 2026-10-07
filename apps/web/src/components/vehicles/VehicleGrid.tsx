import type { ReactNode } from 'react';
import type { VehicleDto } from '@/types';
import { cn } from '@/utils/cn';
import { VehicleCard, VehicleCardSkeleton } from './VehicleCard';

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';

interface VehicleGridProps {
  vehicles: VehicleDto[];
  /** Dim (but keep) current results while the next set loads. */
  refreshing?: boolean;
  className?: string;
  renderAction?: (vehicle: VehicleDto) => ReactNode;
}

export function VehicleGrid({ vehicles, refreshing, className, renderAction }: VehicleGridProps) {
  return (
    <div
      className={cn(GRID, 'transition-opacity duration-200', refreshing && 'opacity-60', className)}
      aria-busy={refreshing || undefined}
    >
      {vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} action={renderAction?.(vehicle)} />
      ))}
    </div>
  );
}

export function VehicleGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn(GRID, className)} role="status" aria-label="Loading vehicles">
      {Array.from({ length: count }, (_, index) => (
        <VehicleCardSkeleton key={index} />
      ))}
    </div>
  );
}
