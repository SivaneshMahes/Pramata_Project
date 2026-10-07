import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { CheckCircle2, ChevronLeft, SearchX } from 'lucide-react';
import { ApiError, errorMessage } from '@/api/client';
import { Button, ButtonLink } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/common/Skeleton';
import { Stars } from '@/components/common/StarRating';
import { VehicleImage } from '@/components/common/VehicleImage';
import { BookingProgress } from '@/components/bookings/BookingProgress';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import { InvoiceButton } from '@/components/bookings/InvoiceButton';
import { PriceBreakdown } from '@/components/bookings/PriceBreakdown';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { BOOKING_STATUS_META } from '@/constants/labels';
import { paths } from '@/constants/routes';
import { useToast } from '@/context/ToastContext';
import { useBooking, useCancelBooking } from '@/hooks/useBookings';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDate, formatWeekday, pluralize } from '@/utils/format';
import { SPRING_DEFAULT } from '@/utils/motion';

export default function CustomerBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const { data: booking, isPending, isError, error, refetch } = useBooking(id);
  const cancel = useCancelBooking();
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  useDocumentTitle(booking ? `Booking · ${booking.vehicle.name}` : 'Booking');

  const confirmed = params.get('confirmed') === '1';

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Loading booking">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-card" />
      </div>
    );
  }
  if (isError) {
    return error instanceof ApiError && (error.status === 404 || error.status === 400) ? (
      <EmptyState
        icon={<SearchX />}
        title="Booking not found"
        description="It may belong to a different account."
        action={<ButtonLink to={paths.customer.bookings}>My bookings</ButtonLink>}
      />
    ) : (
      <ErrorState error={error} onRetry={() => void refetch()} />
    );
  }

  const meta = BOOKING_STATUS_META[booking.status];
  const canReview = booking.status === 'RETURNED';

  const doCancel = () =>
    cancel.mutate(booking.id, {
      onSuccess: () => toast.success('Booking cancelled', 'The dates are free for others again.'),
      onError: (cancelError) => toast.error('Couldn’t cancel', errorMessage(cancelError)),
      onSettled: () => setConfirmCancel(false),
    });

  return (
    <div className="flex flex-col gap-5">
      <Link
        to={paths.customer.bookings}
        className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden /> My bookings
      </Link>

      <AnimatePresence>
        {confirmed && booking.status === 'PENDING' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING_DEFAULT}
            role="status"
            className="flex items-start gap-3 rounded-card border border-success/20 bg-success-soft p-4"
          >
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div className="flex-1">
              <p className="font-medium text-ink">Request sent</p>
              <p className="text-sm text-slate-700">
                {booking.owner.name} will review it soon. Your dates are held while it’s pending.
                Booking reference{' '}
                <span className="font-mono text-xs">{booking.id.slice(-8).toUpperCase()}</span>.
              </p>
            </div>
            <button
              type="button"
              className="text-sm text-muted hover:text-ink"
              onClick={() => setParams({}, { replace: true })}
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-5">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <VehicleImage
                src={booking.vehicle.image}
                alt=""
                type={booking.vehicle.type}
                className="h-28 w-full shrink-0 rounded-lg sm:h-20 sm:w-28"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold">{booking.vehicle.name}</h1>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {booking.vehicle.location} · Hosted by {booking.owner.name}
                </p>
                <Link
                  to={paths.vehicle(booking.vehicle.id)}
                  className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                >
                  View vehicle
                </Link>
              </div>
            </div>
            <div className="border-t border-line p-5">
              <BookingProgress status={booking.status} />
              <p className="mt-3 text-sm text-muted">{meta.description}</p>
            </div>
            <dl className="grid grid-cols-2 gap-4 border-t border-line p-5 text-sm">
              <div>
                <dt className="text-muted">Pickup</dt>
                <dd className="mt-0.5 font-medium">{formatWeekday(booking.startDate)}</dd>
              </div>
              <div>
                <dt className="text-muted">Return</dt>
                <dd className="mt-0.5 font-medium">{formatWeekday(booking.endDate)}</dd>
              </div>
              <div>
                <dt className="text-muted">Duration</dt>
                <dd className="mt-0.5 font-medium">{pluralize(booking.totalDays, 'day')}</dd>
              </div>
              <div>
                <dt className="text-muted">Requested</dt>
                <dd className="mt-0.5 font-medium">{formatDate(booking.createdAt.slice(0, 10))}</dd>
              </div>
            </dl>
          </Card>

          {canReview && (
            <Card className="p-5">
              <h2 className="text-[0.9375rem] font-semibold">
                {booking.review ? 'Your review' : 'How was your rental?'}
              </h2>
              <div className="mt-3">
                {booking.review && !editingReview ? (
                  <div className="flex flex-col gap-2">
                    <Stars value={booking.review.rating} size="md" />
                    {booking.review.comment && (
                      <p className="text-[0.9375rem] text-slate-700">{booking.review.comment}</p>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-1 self-start"
                      onClick={() => setEditingReview(true)}
                    >
                      Edit review
                    </Button>
                  </div>
                ) : (
                  <ReviewForm
                    bookingId={booking.id}
                    vehicleId={booking.vehicle.id}
                    existing={booking.review}
                    onDone={() => setEditingReview(false)}
                    {...(booking.review ? { onCancel: () => setEditingReview(false) } : {})}
                  />
                )}
              </div>
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-3 text-[0.9375rem] font-semibold">Price details</h2>
            <PriceBreakdown booking={booking} />
            <p className="mt-3 text-xs text-muted">Price locked at booking time.</p>
          </Card>
          <InvoiceButton booking={booking} />
          {booking.canCancel && (
            <Button variant="dangerGhost" onClick={() => setConfirmCancel(true)}>
              Cancel booking
            </Button>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
        loading={cancel.isPending}
        tone="danger"
        title="Cancel this booking?"
        description={`Your ${booking.vehicle.name} rental for ${formatDate(booking.startDate)} will be cancelled and the dates released. This can’t be undone.`}
        confirmLabel="Cancel booking"
      />
    </div>
  );
}
