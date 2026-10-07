import { CalendarDays } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { BOOKING_SCOPES } from '@vrp/shared-types';
import { ButtonLink } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { LoadingSkeleton } from '@/components/common/Skeleton';
import { BookingListItem } from '@/components/bookings/BookingListItem';
import { paths } from '@/constants/routes';
import { useBookingSummary, useMyBookings } from '@/hooks/useBookings';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { BookingScope } from '@/types';

const EMPTY: Record<BookingScope, string> = {
  upcoming: 'Requests and confirmed trips that haven’t started appear here.',
  active: 'Rentals you’ve picked up appear here until they’re returned.',
  previous: 'Completed, cancelled and declined rentals appear here.',
};

export default function CustomerBookingsPage() {
  useDocumentTitle('My bookings');
  const [params, setParams] = useSearchParams();
  const scopeParam = params.get('scope') as BookingScope | null;
  const scope: BookingScope =
    scopeParam && BOOKING_SCOPES.includes(scopeParam) ? scopeParam : 'upcoming';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useMyBookings(
    scope,
    page,
  );
  const summary = useBookingSummary();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My bookings" description="Track requests, pickups and past rentals." />
      <SegmentedControl
        label="Booking status"
        value={scope}
        onChange={(next) => setParams({ scope: next }, { replace: true })}
        options={[
          { value: 'upcoming', label: 'Upcoming', count: summary.data?.upcoming },
          { value: 'active', label: 'Active', count: summary.data?.active },
          { value: 'previous', label: 'Previous' },
        ]}
      />
      {isPending ? (
        <LoadingSkeleton rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={`No ${scope} bookings`}
          description={EMPTY[scope]}
          action={
            <ButtonLink to={paths.browse} variant="secondary">
              Browse vehicles
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ul
            className={`flex flex-col gap-2 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
          >
            {data.items.map((booking) => (
              <BookingListItem
                key={booking.id}
                booking={booking}
                to={paths.customer.booking(booking.id)}
              />
            ))}
          </ul>
          <Pagination
            pagination={data.pagination}
            onPageChange={(next) => setParams({ scope, page: String(next) })}
          />
        </>
      )}
    </div>
  );
}
