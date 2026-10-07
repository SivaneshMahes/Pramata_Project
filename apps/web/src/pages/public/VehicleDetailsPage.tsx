import { Link, useParams, useSearchParams } from 'react-router';
import { ChevronLeft, MapPin, SearchX, ShieldCheck, Tag } from 'lucide-react';
import { ApiError } from '@/api/client';
import { Badge } from '@/components/common/Badge';
import { ButtonLink } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/common/Skeleton';
import { RatingSummary } from '@/components/common/StarRating';
import { ReviewList } from '@/components/reviews/ReviewList';
import { AvailabilityCalendar } from '@/components/vehicles/AvailabilityCalendar';
import { RentalPanel } from '@/components/vehicles/RentalPanel';
import { VehicleGallery } from '@/components/vehicles/VehicleGallery';
import { WishlistButton } from '@/components/vehicles/WishlistButton';
import { VEHICLE_TYPE_LABELS } from '@/constants/labels';
import { paths } from '@/constants/routes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useVehicle } from '@/hooks/useVehicles';
import { isValidDateOnly } from '@/utils/dates';
import { initials } from '@/utils/format';

export default function VehicleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: vehicle, isPending, isError, error, refetch } = useVehicle(id);
  const [params, setParams] = useSearchParams();
  useDocumentTitle(vehicle?.name);

  // Dates live in the URL so a shared link (or returning from sign-in) keeps them.
  const start = params.get('start') ?? '';
  const end = params.get('end') ?? '';
  const startDate = isValidDateOnly(start) ? start : '';
  const endDate = isValidDateOnly(end) ? end : '';
  const setDates = (dates: { startDate: string; endDate: string }) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of [
          ['start', dates.startDate],
          ['end', dates.endDate],
        ] as const) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );

  if (isPending) return <DetailsSkeleton />;
  if (isError) {
    const missing = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {missing ? (
          <EmptyState
            icon={<SearchX />}
            title="This vehicle isn’t available"
            description="It may have been removed by its owner."
            action={<ButtonLink to={paths.browse}>Browse vehicles</ButtonLink>}
          />
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6">
      <Link
        to={paths.browse}
        className="inline-flex items-center gap-1 rounded-md py-2 text-sm text-muted hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden /> All vehicles
      </Link>

      <div className="mt-2 grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          <VehicleGallery vehicle={vehicle} />

          <header className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold sm:text-3xl">{vehicle.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
                  <RatingSummary rating={vehicle.averageRating} count={vehicle.reviewCount} />
                  <span className="inline-flex items-center gap-1">
                    <Tag className="size-3.5" aria-hidden /> {VEHICLE_TYPE_LABELS[vehicle.type]}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden /> {vehicle.location}
                  </span>
                  {vehicle.isAvailable ? (
                    <Badge tone="success">Taking bookings</Badge>
                  ) : (
                    <Badge>Bookings paused</Badge>
                  )}
                </div>
              </div>
              <WishlistButton vehicleId={vehicle.id} variant="inline" />
            </div>
          </header>

          <div className="flex items-center gap-3 border-y border-line py-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
              {initials(vehicle.owner.name)}
            </span>
            <div>
              <p className="text-sm font-medium">Hosted by {vehicle.owner.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted">
                <ShieldCheck className="size-3.5" aria-hidden /> Registration{' '}
                {vehicle.registrationNumber}
              </p>
            </div>
          </div>

          <section aria-labelledby="about">
            <h2 id="about" className="text-lg font-semibold">
              About this vehicle
            </h2>
            <p className="mt-2 leading-relaxed whitespace-pre-line text-slate-700">
              {vehicle.description}
            </p>
          </section>

          {vehicle.features.length > 0 && (
            <section aria-labelledby="features">
              <h2 id="features" className="text-lg font-semibold">
                Features
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {vehicle.features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-full border border-line bg-surface px-3 py-1 text-sm"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="availability">
            <h2 id="availability" className="text-lg font-semibold">
              Availability
            </h2>
            <p className="mt-1 text-sm text-muted">
              Tap a free day to start your rental, then tap the return day.
            </p>
            <div className="mt-4">
              <AvailabilityCalendar
                vehicleId={vehicle.id}
                isAvailable={vehicle.isAvailable}
                startDate={startDate}
                endDate={endDate}
                onSelect={setDates}
              />
            </div>
          </section>

          <section aria-labelledby="reviews">
            <h2 id="reviews" className="mb-4 text-lg font-semibold">
              Reviews
            </h2>
            <ReviewList vehicleId={vehicle.id} />
          </section>
        </div>

        <aside aria-label="Rent this vehicle" className="lg:row-span-2">
          <div className="lg:sticky lg:top-20">
            <RentalPanel
              vehicle={vehicle}
              startDate={startDate}
              endDate={endDate}
              onDatesChange={setDates}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6"
      role="status"
      aria-label="Loading vehicle"
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
        <div className="flex flex-col gap-6">
          <Skeleton className="aspect-[16/10] w-full rounded-card" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-96 rounded-card" />
      </div>
    </div>
  );
}
