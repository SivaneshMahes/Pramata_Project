import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import type { BookingDto } from '@/types';
import { formatCurrency, formatDateRange, pluralize } from '@/utils/format';
import { VehicleImage } from '../common/VehicleImage';
import { BookingStatusBadge } from './BookingStatusBadge';

/** One row in a customer's booking list. The whole row opens the booking. */
export function BookingListItem({ booking, to }: { booking: BookingDto; to: string }) {
  return (
    <li>
      <Link
        to={to}
        className="pressable group flex items-center gap-4 rounded-card border border-line bg-surface p-3 shadow-raised hover:border-slate-300 sm:p-4"
      >
        <VehicleImage
          src={booking.vehicle.image}
          alt=""
          type={booking.vehicle.type}
          className="size-16 shrink-0 rounded-lg sm:h-16 sm:w-24"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="truncate font-medium">{booking.vehicle.name}</p>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {formatDateRange(booking.startDate, booking.endDate)} ·{' '}
            {pluralize(booking.totalDays, 'day')}
          </p>
          <p className="text-sm text-muted">{booking.vehicle.location}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="tabular hidden font-medium sm:inline">
            {formatCurrency(booking.totalAmount)}
          </span>
          <ChevronRight
            className="size-4 text-subtle transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </Link>
    </li>
  );
}
