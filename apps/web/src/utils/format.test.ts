import { describe, expect, it } from 'vitest';
import { safeRedirect } from './redirect';
import { safeRentalDays } from './dates';
import { formatDateRange, pluralize } from './format';

describe('format helpers', () => {
  it('collapses the year in same-year ranges', () => {
    expect(formatDateRange('2026-10-10', '2026-10-15')).toMatch(/^10 Oct – 15 Oct 2026$/);
  });

  it('pluralises', () => {
    expect(pluralize(1, 'day')).toBe('1 day');
    expect(pluralize(3, 'day')).toBe('3 days');
  });
});

describe('rental estimate', () => {
  it('counts [start, end) days and ignores incomplete ranges', () => {
    expect(safeRentalDays('2026-10-10', '2026-10-15')).toBe(5);
    expect(safeRentalDays('2026-10-15', '2026-10-10')).toBeNull();
    expect(safeRentalDays('2026-10-10', '')).toBeNull();
  });
});

describe('safeRedirect', () => {
  it('only allows same-app paths', () => {
    expect(safeRedirect('/customer/bookings', '/')).toBe('/customer/bookings');
    expect(safeRedirect('https://evil.example', '/')).toBe('/');
    expect(safeRedirect('//evil.example', '/')).toBe('/');
    expect(safeRedirect(null, '/home')).toBe('/home');
  });
});
