import { DiscountType } from '@vrp/shared-types';
import type { DiscountType as DiscountTypeValue } from '@vrp/shared-types';

export interface DiscountRule {
  code: string;
  discountType: DiscountTypeValue;
  discountValue: number;
  maxDiscount: number | null;
}

export interface PriceBreakdown {
  totalDays: number;
  dailyPrice: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  couponCode: string | null;
}

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

/**
 * Pure pricing: totalDays × dailyPrice, minus an optional discount. The server
 * is the only place this runs for real money — the UI estimate is cosmetic.
 */
export const pricingService = {
  calculateSubtotal(dailyPrice: number, totalDays: number): number {
    return roundMoney(dailyPrice * totalDays);
  },

  calculateDiscount(subtotal: number, rule: DiscountRule): number {
    const raw =
      rule.discountType === DiscountType.PERCENTAGE
        ? (subtotal * rule.discountValue) / 100
        : rule.discountValue;
    const capped = rule.maxDiscount === null ? raw : Math.min(raw, rule.maxDiscount);
    return roundMoney(Math.max(0, Math.min(capped, subtotal)));
  },

  quote(dailyPrice: number, totalDays: number, discount?: DiscountRule | null): PriceBreakdown {
    const subtotal = this.calculateSubtotal(dailyPrice, totalDays);
    const discountAmount = discount ? this.calculateDiscount(subtotal, discount) : 0;
    return {
      totalDays,
      dailyPrice,
      subtotal,
      discountAmount,
      totalAmount: roundMoney(subtotal - discountAmount),
      couponCode: discount?.code ?? null,
    };
  },
};
