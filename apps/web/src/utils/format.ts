const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const formatCurrency = (amount: number): string => currency.format(amount);

// Rental dates are calendar days; format them in UTC so they never shift.
const dayFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const shortDayFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const weekdayFormat = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const asUtc = (dateOnly: string) => new Date(`${dateOnly}T00:00:00.000Z`);

export const formatDate = (dateOnly: string): string => dayFormat.format(asUtc(dateOnly));
export const formatWeekday = (dateOnly: string): string => weekdayFormat.format(asUtc(dateOnly));

/** "10 – 15 Oct 2026" style range, collapsing the shared year. */
export function formatDateRange(start: string, end: string): string {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${sameYear ? shortDayFormat.format(asUtc(start)) : formatDate(start)} – ${formatDate(end)}`;
}

export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

export const formatRating = (rating: number): string => rating.toFixed(1);

export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
