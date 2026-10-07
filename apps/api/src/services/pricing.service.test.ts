import { BOOKING_STATUSES, BOOKING_TRANSITIONS } from '@vrp/shared-types';
import { describe, expect, it } from 'vitest';
import { assertValidRentalWindow } from './bookingRules.js';
import { assertTransition } from './bookingStateMachine.js';
import { pricingService } from './pricing.service.js';

describe('pricingService', () => {
  it('multiplies days by the daily price', () => {
    expect(pricingService.quote(1800, 3)).toMatchObject({
      subtotal: 5400,
      discountAmount: 0,
      totalAmount: 5400,
    });
  });

  it('applies a capped percentage discount', () => {
    const rule = {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE' as const,
      discountValue: 10,
      maxDiscount: 300,
    };
    expect(pricingService.quote(1800, 3, rule)).toMatchObject({
      discountAmount: 300,
      totalAmount: 5100,
      couponCode: 'WELCOME10',
    });
  });

  it('never discounts below zero', () => {
    const rule = {
      code: 'BIG',
      discountType: 'FLAT' as const,
      discountValue: 99_999,
      maxDiscount: null,
    };
    expect(pricingService.quote(500, 1, rule).totalAmount).toBe(0);
  });
});

describe('booking state machine', () => {
  const allowed = new Set(
    Object.entries(BOOKING_TRANSITIONS).flatMap(([from, tos]) => tos.map((to) => `${from}->${to}`)),
  );

  it('allows exactly the six documented transitions', () => {
    expect([...allowed].sort()).toEqual(
      [
        'APPROVED->CANCELLED',
        'APPROVED->HANDED_OVER',
        'HANDED_OVER->RETURNED',
        'PENDING->APPROVED',
        'PENDING->CANCELLED',
        'PENDING->REJECTED',
      ].sort(),
    );
  });

  it.each(BOOKING_STATUSES.flatMap((from) => BOOKING_STATUSES.map((to) => [from, to] as const)))(
    '%s → %s',
    (from, to) => {
      if (allowed.has(`${from}->${to}`)) expect(() => assertTransition(from, to)).not.toThrow();
      else expect(() => assertTransition(from, to)).toThrow(/cannot be marked/);
    },
  );
});

describe('rental window rules', () => {
  it('returns the number of days for a valid window', () => {
    expect(assertValidRentalWindow('2026-10-10', '2026-10-15', '2026-10-01')).toBe(5);
  });

  it('rejects past starts and non-positive lengths', () => {
    expect(() => assertValidRentalWindow('2026-09-30', '2026-10-02', '2026-10-01')).toThrow();
    expect(() => assertValidRentalWindow('2026-10-10', '2026-10-10', '2026-10-01')).toThrow();
  });
});
