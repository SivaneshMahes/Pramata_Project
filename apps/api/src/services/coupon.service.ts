import { ErrorCode } from '@vrp/shared-types';
import type { ClientSession } from 'mongoose';
import type { Coupon } from '../models/Coupon.js';
import { couponRepository } from '../repositories/coupon.repository.js';
import { AppError } from '../utils/AppError.js';
import type { DiscountRule } from './pricing.service.js';

const invalidCoupon = (message: string) => AppError.badRequest(message, ErrorCode.COUPON_INVALID);

function toRule(coupon: Coupon, subtotal: number): DiscountRule {
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw invalidCoupon('This coupon has reached its usage limit.');
  }
  if (subtotal < coupon.minimumAmount) {
    throw invalidCoupon(`This coupon applies to rentals of ₹${coupon.minimumAmount} or more.`);
  }
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maxDiscount: coupon.maxDiscount,
  };
}

export const couponService = {
  /** Read-only validation for price previews. */
  async preview(code: string, subtotal: number): Promise<DiscountRule> {
    const coupon = await couponRepository.findActiveByCode(code, new Date());
    if (!coupon) throw invalidCoupon('This coupon is invalid or has expired.');
    return toRule(coupon, subtotal);
  },

  /** Validates and consumes one use inside the booking transaction. */
  async redeem(code: string, subtotal: number, session: ClientSession): Promise<DiscountRule> {
    const now = new Date();
    const coupon = await couponRepository.findActiveByCode(code, now, session);
    if (!coupon) throw invalidCoupon('This coupon is invalid or has expired.');
    const rule = toRule(coupon, subtotal);
    if (!(await couponRepository.consumeUse(code, now, session))) {
      throw invalidCoupon('This coupon has reached its usage limit.');
    }
    return rule;
  },
};
