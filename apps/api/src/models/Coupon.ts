import { DISCOUNT_TYPES } from '@vrp/shared-types';
import type { DiscountType } from '@vrp/shared-types';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

export interface Coupon {
  _id: Types.ObjectId;
  code: string;
  discountType: DiscountType;
  /** Percentage (0–100) or a flat amount, depending on discountType. */
  discountValue: number;
  maxDiscount: number | null;
  minimumAmount: number;
  expiresAt: Date;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<Coupon>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    discountType: { type: String, enum: DISCOUNT_TYPES, required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    minimumAmount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
    usageLimit: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

couponSchema.index({ code: 1 }, { unique: true });

export const CouponModel = model<Coupon>('Coupon', couponSchema);
