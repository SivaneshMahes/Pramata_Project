import type { BookingDto } from '@/types';
import { formatCurrency, pluralize } from '@/utils/format';

export function PriceBreakdown({ booking }: { booking: BookingDto }) {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">
          {formatCurrency(booking.dailyPrice)} × {pluralize(booking.totalDays, 'day')}
        </dt>
        <dd className="tabular">{formatCurrency(booking.subtotal)}</dd>
      </div>
      {booking.discountAmount > 0 && (
        <div className="flex justify-between text-success">
          <dt>Coupon {booking.couponCode}</dt>
          <dd className="tabular">−{formatCurrency(booking.discountAmount)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular">{formatCurrency(booking.totalAmount)}</dd>
      </div>
    </dl>
  );
}
