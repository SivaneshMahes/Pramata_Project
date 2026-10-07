import { ArrowRight, CalendarCheck2, CalendarClock, CarFront, Wallet } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/common/Button';
import { Card, CardHeader } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingSkeleton } from '@/components/common/Skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { BookingListItem } from '@/components/bookings/BookingListItem';
import { StatTile, StatTileSkeleton } from '@/components/dashboard/StatTile';
import { paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useBookingSummary, useMyBookings } from '@/hooks/useBookings';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { BookingScope } from '@/types';
import { formatCurrency } from '@/utils/format';

function BookingSection({
  scope,
  title,
  empty,
}: {
  scope: BookingScope;
  title: string;
  empty: string;
}) {
  const { data, isPending, isError, error, refetch } = useMyBookings(scope, 1, 3);
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          data && data.pagination.total > 3 ? (
            <Link
              to={`${paths.customer.bookings}?scope=${scope}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ) : null
        }
      />
      <div className="p-4">
        {isPending ? (
          <LoadingSkeleton rows={2} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.items.map((booking) => (
              <BookingListItem
                key={booking.id}
                booking={booking}
                to={paths.customer.booking(booking.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export default function CustomerDashboardPage() {
  useDocumentTitle('Overview');
  const { user } = useAuth();
  const summary = useBookingSummary();
  const firstName = user?.name.split(' ')[0] ?? '';
  const hasAnyBooking =
    summary.data && summary.data.upcoming + summary.data.active + summary.data.completed > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hi, ${firstName}`}
        description="Your rentals at a glance."
        actions={<ButtonLink to={paths.browse}>Find a vehicle</ButtonLink>}
      />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.isPending ? (
          Array.from({ length: 4 }, (_, index) => <StatTileSkeleton key={index} />)
        ) : summary.isError ? (
          <ErrorState
            className="col-span-full"
            error={summary.error}
            onRetry={() => void summary.refetch()}
          />
        ) : (
          <>
            <StatTile
              label="Upcoming"
              value={summary.data.upcoming}
              icon={<CalendarClock />}
              hint="Awaiting pickup"
            />
            <StatTile
              label="Active now"
              value={summary.data.active}
              icon={<CarFront />}
              hint="Currently with you"
            />
            <StatTile
              label="Completed"
              value={summary.data.completed}
              icon={<CalendarCheck2 />}
              hint="Returned rentals"
            />
            <StatTile
              label="Total spent"
              value={formatCurrency(summary.data.totalSpent)}
              icon={<Wallet />}
              hint="On picked-up rentals"
            />
          </>
        )}
      </section>

      {summary.data && !hasAnyBooking ? (
        <EmptyState
          icon={<CarFront />}
          title="No rentals yet"
          description="Browse vehicles near you, pick your dates and send a request — owners usually respond within a day."
          action={<ButtonLink to={paths.browse}>Browse vehicles</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <BookingSection
            scope="active"
            title="Active rentals"
            empty="Nothing on the road right now."
          />
          <BookingSection scope="upcoming" title="Upcoming rentals" empty="No upcoming trips." />
          <div className="lg:col-span-2">
            <BookingSection
              scope="previous"
              title="Rental history"
              empty="Completed and cancelled rentals appear here."
            />
          </div>
        </div>
      )}
    </div>
  );
}
