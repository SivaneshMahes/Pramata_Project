import { addDays, isValidDateOnly, rentalDays, todayInTimeZone } from '@vrp/validation';

export { addDays, isValidDateOnly, rentalDays };

/** The user's local calendar date — used for date-picker minimums only. */
export const localToday = (): string =>
  todayInTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);

/** Days in [start, end), or null while the range is incomplete or invalid. */
export function safeRentalDays(start: string, end: string): number | null {
  if (!isValidDateOnly(start) || !isValidDateOnly(end) || end <= start) return null;
  return rentalDays(start, end);
}
