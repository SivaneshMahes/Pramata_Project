/**
 * Rental dates are calendar days, not instants. They travel as `YYYY-MM-DD`
 * strings and are stored as UTC midnight so arithmetic never crosses a DST
 * boundary or a server timezone. A booking occupies the half-open interval
 * [startDate, endDate): the vehicle is free again on endDate.
 */
const DAY_MS = 86_400_000;
export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function dateOnlyToUtc(value: string): Date {
  if (!isValidDateOnly(value)) throw new RangeError(`Invalid date: ${value}`);
  return new Date(`${value}T00:00:00.000Z`);
}

export function utcToDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return utcToDateOnly(new Date(dateOnlyToUtc(value).getTime() + days * DAY_MS));
}

/** Number of rental days in [start, end). 10 Oct → 15 Oct is 5 days. */
export function rentalDays(start: string, end: string): number {
  return Math.round((dateOnlyToUtc(end).getTime() - dateOnlyToUtc(start).getTime()) / DAY_MS);
}

/** Today's calendar date in the given IANA timezone, as YYYY-MM-DD. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Half-open interval overlap: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅ */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}
