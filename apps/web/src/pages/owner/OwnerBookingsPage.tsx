import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { CalendarDays, Mail } from 'lucide-react';
import { BOOKING_STATUSES } from '@vrp/shared-types';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Modal } from '@/components/common/Modal';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { LoadingSkeleton } from '@/components/common/Skeleton';
import { VehicleImage } from '@/components/common/VehicleImage';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import { InvoiceButton } from '@/components/bookings/InvoiceButton';
import { OwnerBookingActions } from '@/components/bookings/OwnerBookingActions';
import { PriceBreakdown } from '@/components/bookings/PriceBreakdown';
import { BOOKING_STATUS_META } from '@/constants/labels';
import { useOwnerBookings } from '@/hooks/useBookings';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { BookingDto, BookingStatus } from '@/types';
import {
  formatCurrency,
  formatDateRange,
  formatWeekday,
  initials,
  pluralize,
} from '@/utils/format';

type Filter = BookingStatus | 'ALL';

export default function OwnerBookingsPage() {
  useDocumentTitle('Bookings');
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status') as BookingStatus | null;
  const status: Filter =
    statusParam && BOOKING_STATUSES.includes(statusParam) ? statusParam : 'ALL';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useOwnerBookings(
    status === 'ALL' ? undefined : status,
    page,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Read the selected booking from the live list so actions taken in the dialog show immediately.
  const selected = data?.items.find((booking) => booking.id === selectedId) ?? null;

  const options: { value: Filter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'PENDING', label: 'Requests' },
    { value: 'APPROVED', label: 'Confirmed' },
    { value: 'HANDED_OVER', label: 'In progress' },
    { value: 'RETURNED', label: 'Completed' },
    { value: 'REJECTED', label: 'Declined' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bookings"
        description="Approve requests, hand over keys and close out returns."
      />
      <SegmentedControl
        label="Filter by status"
        value={status}
        onChange={(next) => setParams(next === 'ALL' ? {} : { status: next }, { replace: true })}
        options={options}
      />

      {isPending ? (
        <LoadingSkeleton rows={4} label="Loading bookings" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={
            status === 'ALL'
              ? 'No bookings yet'
              : `No ${options.find((o) => o.value === status)?.label.toLowerCase()} bookings`
          }
          description="Booking requests for your vehicles show up here."
        />
      ) : (
        <>
          {/* Table on wide screens, stacked rows on phones. */}
          <div
            className={`overflow-hidden rounded-card border border-line bg-surface shadow-raised transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
          >
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="border-b border-line bg-canvas/60 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Vehicle
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Dates
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((booking) => (
                  <tr key={booking.id} className="align-middle hover:bg-canvas/50">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-left font-medium hover:underline"
                        onClick={() => setSelectedId(booking.id)}
                      >
                        {booking.vehicle.name}
                      </button>
                      <p className="font-mono text-xs text-muted">
                        {booking.vehicle.registrationNumber}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{booking.customer.name}</p>
                      <p className="text-xs text-muted">{booking.customer.email}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateRange(booking.startDate, booking.endDate)}
                      <p className="text-xs text-muted">{pluralize(booking.totalDays, 'day')}</p>
                    </td>
                    <td className="tabular px-4 py-3 text-right font-medium">
                      {formatCurrency(booking.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <OwnerBookingActions booking={booking} />
                        {!['PENDING', 'APPROVED', 'HANDED_OVER'].includes(booking.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedId(booking.id)}
                          >
                            Details
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line md:hidden">
              {data.items.map((booking) => (
                <li key={booking.id} className="flex flex-col gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setSelectedId(booking.id)}
                    className="flex items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{booking.vehicle.name}</p>
                      <p className="text-sm text-muted">
                        {booking.customer.name} ·{' '}
                        {formatDateRange(booking.startDate, booking.endDate)}
                      </p>
                      <p className="tabular text-sm font-medium">
                        {formatCurrency(booking.totalAmount)}
                      </p>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </button>
                  <OwnerBookingActions booking={booking} />
                </li>
              ))}
            </ul>
          </div>
          <Pagination
            pagination={data.pagination}
            onPageChange={(next) =>
              setParams({ ...(status !== 'ALL' ? { status } : {}), page: String(next) })
            }
          />
        </>
      )}

      <BookingDetailDialog booking={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

/** Customer contact and booking facts in one place for the owner. */
function BookingDetailDialog({
  booking,
  onClose,
}: {
  booking: BookingDto | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(booking)}
      onClose={onClose}
      title={booking ? booking.vehicle.name : ''}
      description={booking ? BOOKING_STATUS_META[booking.status].description : undefined}
    >
      {booking && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <VehicleImage
              src={booking.vehicle.image}
              alt=""
              type={booking.vehicle.type}
              className="h-14 w-20 rounded-lg"
            />
            <div>
              <BookingStatusBadge status={booking.status} />
              <p className="mt-1 text-xs text-muted">
                Ref {booking.id.slice(-8).toUpperCase()} · {booking.vehicle.registrationNumber}
              </p>
            </div>
          </div>
          <section
            aria-label="Customer"
            className="flex items-center gap-3 rounded-control bg-canvas p-3"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
              {initials(booking.customer.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{booking.customer.name}</p>
              <a
                href={`mailto:${booking.customer.email}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Mail className="size-3.5" aria-hidden /> {booking.customer.email}
              </a>
            </div>
          </section>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Pickup</dt>
              <dd className="font-medium">{formatWeekday(booking.startDate)}</dd>
            </div>
            <div>
              <dt className="text-muted">Return</dt>
              <dd className="font-medium">{formatWeekday(booking.endDate)}</dd>
            </div>
          </dl>
          <PriceBreakdown booking={booking} />
          <div className="flex flex-wrap items-start justify-between gap-3 border-t border-line pt-4">
            <OwnerBookingActions booking={booking} size="md" />
            <InvoiceButton booking={booking} />
          </div>
        </div>
      )}
    </Modal>
  );
}
