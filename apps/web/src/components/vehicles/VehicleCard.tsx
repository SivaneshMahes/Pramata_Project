import { Link } from 'react-router';
import { VEHICLE_TYPE_LABELS } from '@/constants/labels';
import { paths } from '@/constants/routes';
import type { VehicleDto } from '@/types';
import { formatCurrency } from '@/utils/format';
import { Skeleton } from '../common/Skeleton';
import { RatingSummary } from '../common/StarRating';
import { VehicleImage } from '../common/VehicleImage';

/**
 * Compact hierarchy: image → name → price → rating → type · location →
 * a few features. One link covers the whole card (stretched link).
 */
export function VehicleCard({
  vehicle,
  action,
}: {
  vehicle: VehicleDto;
  action?: React.ReactNode;
}) {
  const features = vehicle.features.slice(0, 3);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-raised transition-[border-color,box-shadow] duration-200 hover:border-slate-300 hover:shadow-overlay">
      <div className="relative aspect-[4/3] overflow-hidden">
        <VehicleImage
          src={vehicle.images[0]?.url}
          alt={vehicle.name}
          type={vehicle.type}
          className="size-full transition-transform duration-500 ease-[var(--ease-out-quart)] group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {!vehicle.isAvailable && (
          <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-ink shadow-raised">
            Not taking bookings
          </span>
        )}
        {action && <div className="absolute top-2.5 right-2.5 z-10">{action}</div>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-[0.9375rem] font-semibold">
            <Link
              to={paths.vehicle(vehicle.id)}
              className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-card after:focus-visible:outline-2 after:focus-visible:outline-primary"
            >
              {vehicle.name}
            </Link>
          </h3>
          <p className="shrink-0 text-sm">
            <span className="tabular font-semibold">{formatCurrency(vehicle.dailyPrice)}</span>
            <span className="text-muted">/day</span>
          </p>
        </div>
        <RatingSummary rating={vehicle.averageRating} count={vehicle.reviewCount} />
        <p className="text-sm text-muted">
          {VEHICLE_TYPE_LABELS[vehicle.type]} · {vehicle.location}
        </p>
        {features.length > 0 && (
          <p className="truncate text-sm text-muted">{features.join(' · ')}</p>
        )}
        <p className="mt-auto pt-2 text-xs text-subtle">Hosted by {vehicle.owner.name}</p>
      </div>
    </article>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-4 w-1/5" />
        </div>
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
    </div>
  );
}
