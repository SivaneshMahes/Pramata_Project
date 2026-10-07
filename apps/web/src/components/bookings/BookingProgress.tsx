import { Check } from 'lucide-react';
import type { BookingStatus } from '@/types';
import { cn } from '@/utils/cn';

const STEPS: { status: BookingStatus; label: string }[] = [
  { status: 'PENDING', label: 'Requested' },
  { status: 'APPROVED', label: 'Confirmed' },
  { status: 'HANDED_OVER', label: 'Picked up' },
  { status: 'RETURNED', label: 'Returned' },
];

/** Where the booking is in its lifecycle. Ended bookings say why instead. */
export function BookingProgress({ status }: { status: BookingStatus }) {
  if (status === 'CANCELLED' || status === 'REJECTED') return null;
  const current = STEPS.findIndex((step) => step.status === status);

  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Booking progress">
      {STEPS.map((step, index) => {
        const done = index <= current;
        return (
          <li
            key={step.status}
            className="flex flex-col gap-2"
            aria-current={index === current ? 'step' : undefined}
          >
            <div className={cn('h-1 rounded-full', done ? 'bg-ink' : 'bg-line')} />
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                done ? 'font-medium text-ink' : 'text-muted',
              )}
            >
              {done && index < current && <Check className="size-3" aria-hidden />}
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
