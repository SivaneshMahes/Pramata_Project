import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { queryKeys } from '@/constants/queryKeys';
import { vehicleService } from '@/services/vehicle.service';
import type { VehicleCalendarDto } from '@/types';
import { cn } from '@/utils/cn';
import { addDays, localToday } from '@/utils/dates';
import { formatWeekday } from '@/utils/format';
import { ErrorState } from '../common/ErrorState';
import { Skeleton } from '../common/Skeleton';

interface AvailabilityCalendarProps {
  vehicleId: string;
  isAvailable: boolean;
  startDate: string;
  endDate: string;
  onSelect: (range: { startDate: string; endDate: string }) => void;
}

type DayState = 'past' | 'booked' | 'unavailable' | 'available';

const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
const shiftMonth = (first: string, delta: number) => {
  const [y, m] = first.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 10);
};
const monthLabel = (first: string) =>
  new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${first}T00:00:00Z`),
  );
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Booked ranges are half-open [start, end): the end day itself is free. */
function isBooked(day: string, calendar: VehicleCalendarDto | undefined) {
  return (
    calendar?.bookedRanges.some((range) => range.startDate <= day && day < range.endDate) ?? false
  );
}

/**
 * Month view fed by the same server-side availability service that guards
 * booking creation, so the calendar can never disagree with the API.
 */
export function AvailabilityCalendar({
  vehicleId,
  isAvailable,
  startDate,
  endDate,
  onSelect,
}: AvailabilityCalendarProps) {
  const today = localToday();
  const [month, setMonth] = useState(() => monthStart(startDate || today));
  const nextMonth = shiftMonth(month, 1);

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useQuery({
    queryKey: queryKeys.vehicles.calendar(vehicleId, month, nextMonth),
    queryFn: () => vehicleService.calendar(vehicleId, month, nextMonth),
    placeholderData: keepPreviousData,
  });

  const days = useMemo(() => {
    const result: string[] = [];
    for (let day = month; day < nextMonth; day = addDays(day, 1)) result.push(day);
    return result;
  }, [month, nextMonth]);
  const leadingBlanks = (new Date(`${month}T00:00:00Z`).getUTCDay() + 6) % 7;

  const stateOf = (day: string): DayState => {
    if (day < today) return 'past';
    if (!isAvailable) return 'unavailable';
    return isBooked(day, data) ? 'booked' : 'available';
  };

  /** First tap sets pickup; second sets the return day if every night between is free. */
  const select = (day: string) => {
    if (!startDate || endDate || day <= startDate) {
      if (stateOf(day) === 'available') onSelect({ startDate: day, endDate: '' });
      return;
    }
    for (let cursor = startDate; cursor < day; cursor = addDays(cursor, 1)) {
      if (isBooked(cursor, data)) {
        onSelect({ startDate: day, endDate: '' });
        return;
      }
    }
    onSelect({ startDate, endDate: day });
  };

  if (isError)
    return <ErrorState error={error} title="Calendar didn’t load" onRetry={() => void refetch()} />;

  return (
    <div className="max-w-md rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={month <= monthStart(today)}
          className="pressable rounded-full p-2 text-muted hover:bg-fill hover:text-ink disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h3 className="text-sm font-semibold" aria-live="polite">
          {monthLabel(month)}
        </h3>
        <button
          type="button"
          onClick={() => setMonth(nextMonth)}
          className="pressable rounded-full p-2 text-muted hover:bg-fill hover:text-ink"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted" aria-hidden>
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="py-1">
            {weekday.slice(0, 2)}
          </span>
        ))}
      </div>

      {isPending ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, index) => (
            <Skeleton key={index} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            'grid grid-cols-7 gap-1 transition-opacity',
            isPlaceholderData && 'opacity-60',
          )}
        >
          {Array.from({ length: leadingBlanks }, (_, index) => (
            <span key={`blank-${index}`} />
          ))}
          {days.map((day) => {
            const state = stateOf(day);
            const inRange = Boolean(startDate && endDate && day >= startDate && day < endDate);
            const isEdge = day === startDate || day === endDate;
            const selectable =
              state === 'available' ||
              (Boolean(startDate) &&
                !endDate &&
                day > startDate &&
                state !== 'past' &&
                state !== 'unavailable');
            const label = `${formatWeekday(day)}, ${state === 'booked' ? 'booked' : state === 'unavailable' ? 'unavailable' : state === 'past' ? 'past' : 'available'}${day === startDate ? ', pickup' : ''}${day === endDate ? ', return' : ''}`;
            return (
              <button
                key={day}
                type="button"
                disabled={!selectable}
                onClick={() => select(day)}
                aria-label={label}
                aria-pressed={isEdge || inRange}
                className={cn(
                  'tabular relative aspect-square rounded-lg text-sm transition-colors duration-100',
                  // Selection wins over every other state (a return day may be another booking's first day).
                  isEdge
                    ? 'bg-ink font-semibold text-white'
                    : inRange
                      ? 'bg-primary-soft text-primary'
                      : {
                          available: 'text-ink hover:bg-fill',
                          booked: 'bg-danger-soft text-danger/70 line-through decoration-danger/40',
                          unavailable: 'bg-fill text-subtle',
                          past: 'text-slate-300',
                        }[state],
                  day === today &&
                    !isEdge &&
                    'font-semibold underline decoration-2 underline-offset-4',
                  !selectable && 'cursor-default',
                )}
              >
                {Number(day.slice(8))}
              </button>
            );
          })}
        </div>
      )}

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        <Legend swatch="border border-line bg-surface" label="Available" />
        <Legend swatch="bg-danger-soft" label="Booked" />
        <Legend swatch="bg-fill" label="Unavailable" />
        <Legend swatch="bg-ink" label="Your dates" />
      </ul>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn('size-3 rounded', swatch)} aria-hidden />
      {label}
    </li>
  );
}
