import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, XCircle } from 'lucide-react';
import { BOOKING_LIMITS } from '@vrp/shared-types';
import { ApiError, errorMessage } from '@/api/client';
import { paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useCreateBooking } from '@/hooks/useBookings';
import { useAvailabilityCheck } from '@/hooks/useVehicles';
import type { VehicleDto } from '@/types';
import { addDays, localToday, safeRentalDays } from '@/utils/dates';
import { formatCurrency, pluralize } from '@/utils/format';
import { SPRING_DEFAULT } from '@/utils/motion';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Input } from '../common/Input';

interface RentalPanelProps {
  vehicle: VehicleDto;
  startDate: string;
  endDate: string;
  onDatesChange: (dates: { startDate: string; endDate: string }) => void;
}

/**
 * The estimate updates as dates change (feedback during the interaction), but
 * it is only an estimate: the server recalculates the price and re-checks
 * availability when the booking is created.
 */
export function RentalPanel({ vehicle, startDate, endDate, onDatesChange }: RentalPanelProps) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const availability = useAvailabilityCheck(vehicle.id);
  const createBooking = useCreateBooking();
  const [couponCode, setCouponCode] = useState('');
  const [showCoupon, setShowCoupon] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const today = localToday();
  const days = safeRentalDays(startDate, endDate);
  const estimate = days ? days * vehicle.dailyPrice : null;
  const tooLong = days !== null && days > BOOKING_LIMITS.MAX_RENTAL_DAYS;
  const datesError =
    startDate && endDate && endDate <= startDate
      ? 'Return date must be after pickup.'
      : tooLong
        ? `Rentals can last up to ${BOOKING_LIMITS.MAX_RENTAL_DAYS} days.`
        : null;
  const canSubmit = Boolean(days) && !datesError;
  const quote = availability.data;
  const quoteMatches = quote && quote.startDate === startDate && quote.endDate === endDate;

  const setDates = (patch: Partial<{ startDate: string; endDate: string }>) => {
    availability.reset();
    setBookingError(null);
    const next = { startDate, endDate, ...patch };
    // Keep the range valid as the pickup date moves past the return date.
    if (patch.startDate && next.endDate && next.endDate <= patch.startDate)
      next.endDate = addDays(patch.startDate, 1);
    onDatesChange(next);
  };

  const params = () => ({
    startDate,
    endDate,
    ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
  });

  const check = () => {
    setBookingError(null);
    availability.mutate(params());
  };

  const rent = () => {
    if (!user) {
      navigate(
        `${paths.login}?redirect=${encodeURIComponent(`${paths.vehicle(vehicle.id)}?start=${startDate}&end=${endDate}`)}`,
      );
      return;
    }
    setBookingError(null);
    createBooking.mutate(
      { vehicle: vehicle.id, ...params() },
      {
        onSuccess: (booking) => {
          toast.success(
            'Booking requested',
            `${vehicle.name} · ${pluralize(booking.totalDays, 'day')}`,
          );
          navigate(`${paths.customer.booking(booking.id)}?confirmed=1`);
        },
        onError: (error) => {
          setBookingError(errorMessage(error));
          if (error instanceof ApiError && error.code === 'BOOKING_CONFLICT') availability.reset();
        },
      },
    );
  };

  const isOwnerAccount = user?.role === 'OWNER';

  return (
    <Card className="p-5">
      <div className="flex items-baseline gap-1">
        <span className="tabular text-2xl font-semibold tracking-tight">
          {formatCurrency(vehicle.dailyPrice)}
        </span>
        <span className="text-muted">/ day</span>
      </div>

      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-control border border-line">
        <label className="flex flex-col gap-0.5 border-r border-line px-3 py-2 focus-within:bg-primary-soft/40">
          <span className="text-[0.6875rem] font-semibold tracking-wide text-muted uppercase">
            Pickup
          </span>
          <input
            type="date"
            min={today}
            value={startDate}
            onChange={(event) => setDates({ startDate: event.target.value })}
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <label className="flex flex-col gap-0.5 px-3 py-2 focus-within:bg-primary-soft/40">
          <span className="text-[0.6875rem] font-semibold tracking-wide text-muted uppercase">
            Return
          </span>
          <input
            type="date"
            min={startDate ? addDays(startDate, 1) : today}
            value={endDate}
            onChange={(event) => setDates({ endDate: event.target.value })}
            className="w-full bg-transparent text-sm outline-none"
            aria-invalid={Boolean(datesError) || undefined}
          />
        </label>
      </div>
      {datesError && (
        <p className="mt-2 text-xs font-medium text-danger" role="alert">
          {datesError}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        Return by the start of the return date. You’re charged per day from pickup up to return.
      </p>

      <div className="mt-3">
        {showCoupon ? (
          <Input
            value={couponCode}
            onChange={(event) => {
              setCouponCode(event.target.value.toUpperCase());
              availability.reset();
            }}
            placeholder="Coupon code"
            aria-label="Coupon code"
            autoFocus
            maxLength={24}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowCoupon(true)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Have a coupon?
          </button>
        )}
      </div>

      <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">
            {formatCurrency(vehicle.dailyPrice)} × {days ? pluralize(days, 'day') : '— days'}
          </dt>
          <dd className="tabular">{estimate !== null ? formatCurrency(estimate) : '—'}</dd>
        </div>
        {quoteMatches && quote.discountAmount > 0 && (
          <div className="flex justify-between text-success">
            <dt>Coupon {quote.couponCode}</dt>
            <dd className="tabular">−{formatCurrency(quote.discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold">
          <dt>{quoteMatches ? 'Total' : 'Estimated total'}</dt>
          <dd className="tabular">
            {quoteMatches
              ? formatCurrency(quote.totalAmount)
              : estimate !== null
                ? formatCurrency(estimate)
                : '—'}
          </dd>
        </div>
      </dl>

      <AnimatePresence initial={false} mode="popLayout">
        {(quoteMatches || availability.isError || bookingError) && (
          <motion.div
            key={quoteMatches ? `${quote.reason}` : 'error'}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={SPRING_DEFAULT}
            role="status"
            className="mt-4"
          >
            {bookingError || availability.isError ? (
              <Notice ok={false} text={bookingError ?? errorMessage(availability.error)} />
            ) : quote?.available ? (
              <Notice ok text="Available for these dates." />
            ) : (
              <Notice
                ok={false}
                text={
                  quote?.reason === 'VEHICLE_UNAVAILABLE'
                    ? 'This vehicle isn’t taking bookings right now.'
                    : 'Already booked for some of these dates.'
                }
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex flex-col gap-2">
        {isOwnerAccount ? (
          <p className="rounded-control bg-fill px-3 py-2.5 text-sm text-muted">
            You’re signed in as an owner. Use a renter account to book vehicles.
          </p>
        ) : (
          <>
            <Button
              size="lg"
              onClick={rent}
              disabled={!canSubmit || !vehicle.isAvailable}
              loading={createBooking.isPending}
            >
              {user ? 'Rent vehicle' : 'Sign in to rent'}
            </Button>
            <Button
              variant="secondary"
              onClick={check}
              disabled={!canSubmit}
              loading={availability.isPending}
            >
              Check availability
            </Button>
          </>
        )}
        {!vehicle.isAvailable && (
          <p className="text-center text-sm text-muted">
            The owner has paused bookings for this vehicle.
          </p>
        )}
        {user && !isOwnerAccount && canSubmit && (
          <p className="text-center text-xs text-muted">
            The owner reviews each request before confirming it.
          </p>
        )}
      </div>
    </Card>
  );
}

function Notice({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      className={
        ok
          ? 'flex items-start gap-2 rounded-control bg-success-soft p-3 text-sm text-success'
          : 'flex items-start gap-2 rounded-control bg-danger-soft p-3 text-sm text-danger'
      }
    >
      {ok ? (
        <CheckCircle2 className="mt-px size-4 shrink-0" aria-hidden />
      ) : (
        <XCircle className="mt-px size-4 shrink-0" aria-hidden />
      )}
      <span>{text}</span>
    </div>
  );
}
