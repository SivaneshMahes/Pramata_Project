import { describe, expect, it } from 'vitest';
import { addDays, isValidDateOnly, rangesOverlap, rentalDays, todayInTimeZone } from './dates.js';
import { createBookingSchema, registrationNumberSchema } from './index.js';

describe('date-only helpers', () => {
  it('rejects impossible calendar dates', () => {
    expect(isValidDateOnly('2026-02-30')).toBe(false);
    expect(isValidDateOnly('2026-13-01')).toBe(false);
    expect(isValidDateOnly('2026-10-10')).toBe(true);
    expect(isValidDateOnly('2028-02-29')).toBe(true);
  });

  it('counts days on the half-open interval', () => {
    expect(rentalDays('2026-10-10', '2026-10-15')).toBe(5);
    expect(rentalDays('2026-10-31', '2026-11-01')).toBe(1);
    // Across a DST change in some zones — UTC arithmetic is unaffected.
    expect(rentalDays('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('treats back-to-back ranges as non-overlapping', () => {
    expect(rangesOverlap('2026-10-10', '2026-10-15', '2026-10-15', '2026-10-20')).toBe(false);
    expect(rangesOverlap('2026-10-10', '2026-10-15', '2026-10-12', '2026-10-17')).toBe(true);
    expect(rangesOverlap('2026-10-10', '2026-10-15', '2026-10-05', '2026-10-10')).toBe(false);
    expect(rangesOverlap('2026-10-10', '2026-10-15', '2026-10-11', '2026-10-12')).toBe(true);
  });

  it('resolves today in a business timezone', () => {
    // 20:00 UTC on Oct 9 is already Oct 10 in India (UTC+5:30).
    const instant = new Date('2026-10-09T20:00:00.000Z');
    expect(todayInTimeZone('Asia/Kolkata', instant)).toBe('2026-10-10');
    expect(todayInTimeZone('UTC', instant)).toBe('2026-10-09');
  });
});

describe('schemas', () => {
  it('normalises registration numbers', () => {
    expect(registrationNumberSchema.parse(' tn 37-ab 1234 ')).toBe('TN37AB1234');
  });

  it('rejects an end date that is not after the start date', () => {
    const result = createBookingSchema.safeParse({
      vehicle: '0123456789abcdef01234567',
      startDate: '2026-10-15',
      endDate: '2026-10-15',
    });
    expect(result.success).toBe(false);
  });
});
