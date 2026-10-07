import { ArrowRight, Car, CarFront, IndianRupee, Plus, Star } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/common/Button';
import { Card, CardHeader } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSkeleton } from '@/components/common/Skeleton';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import { OwnerBookingActions } from '@/components/bookings/OwnerBookingActions';
import { RevenueBars } from '@/components/dashboard/RevenueBars';
import { StatTile, StatTileSkeleton } from '@/components/dashboard/StatTile';
import { paths } from '@/constants/routes';
import { useOwnerDashboard } from '@/hooks/useBookings';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { BookingDto } from '@/types';
import { formatCurrency, formatDateRange, formatRating, pluralize } from '@/utils/format';

function BookingRows({
  bookings,
  empty,
  withActions,
}: {
  bookings: BookingDto[];
  empty: string;
  withActions?: boolean;
}) {
  if (bookings.length === 0)
    return <p className="px-5 py-8 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {bookings.map((booking) => (
        <li
          key={booking.id}
          className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium">{booking.vehicle.name}</p>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="text-sm text-muted">
              {booking.customer.name} · {formatDateRange(booking.startDate, booking.endDate)} ·{' '}
              <span className="tabular">{formatCurrency(booking.totalAmount)}</span>
            </p>
          </div>
          {withActions && <OwnerBookingActions booking={booking} />}
        </li>
      ))}
    </ul>
  );
}

export default function OwnerDashboardPage() {
  useDocumentTitle('Owner overview');
  const { data, isPending, isError, error, refetch } = useOwnerDashboard();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Your fleet, requests and earnings."
        actions={
          <ButtonLink to={paths.owner.newVehicle} icon={<Plus className="size-4" />}>
            Add vehicle
          </ButtonLink>
        }
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {isPending ? (
              Array.from({ length: 4 }, (_, index) => <StatTileSkeleton key={index} />)
            ) : (
              <>
                <StatTile
                  label="Total vehicles"
                  value={data.totalVehicles}
                  icon={<Car />}
                  hint={`${data.availableVehicles} taking bookings`}
                />
                <StatTile
                  label="Active rentals"
                  value={data.activeRentals}
                  icon={<CarFront />}
                  hint={
                    data.pendingRequests > 0
                      ? `${pluralize(data.pendingRequests, 'request')} awaiting you`
                      : 'No pending requests'
                  }
                />
                <StatTile
                  label="Revenue"
                  value={formatCurrency(data.revenue)}
                  icon={<IndianRupee />}
                  hint="From picked-up rentals"
                />
                <StatTile
                  label="Average rating"
                  value={data.ratedReviewCount > 0 ? formatRating(data.averageRating) : '—'}
                  icon={<Star />}
                  hint={
                    data.ratedReviewCount > 0
                      ? pluralize(data.ratedReviewCount, 'review')
                      : 'No reviews yet'
                  }
                />
              </>
            )}
          </section>

          {data && data.totalVehicles === 0 ? (
            <EmptyState
              icon={<Car />}
              title="List your first vehicle"
              description="Add photos, a daily price and where renters pick it up. You approve every request."
              action={<ButtonLink to={paths.owner.newVehicle}>Add vehicle</ButtonLink>}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader
                    title="Recent bookings"
                    action={
                      <Link
                        to={paths.owner.bookings}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        All bookings <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    }
                  />
                  {isPending ? (
                    <div className="p-4">
                      <LoadingSkeleton rows={3} />
                    </div>
                  ) : (
                    <BookingRows
                      bookings={data.recentBookings}
                      empty="No bookings yet."
                      withActions
                    />
                  )}
                </Card>
                <Card>
                  <CardHeader title="Upcoming rentals" />
                  {isPending ? (
                    <div className="p-4">
                      <LoadingSkeleton rows={2} />
                    </div>
                  ) : (
                    <BookingRows
                      bookings={data.upcomingRentals}
                      empty="No confirmed rentals coming up."
                      withActions
                    />
                  )}
                </Card>
              </div>
              <Card className="h-fit">
                <CardHeader title="Earnings, last 6 months" />
                <div className="p-5">
                  {isPending ? (
                    <LoadingSkeleton rows={1} />
                  ) : (
                    <RevenueBars data={data.monthlyRevenue} />
                  )}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
