import type { ClientSession } from 'mongoose';
import { CouponModel } from '../models/Coupon.js';
import type { Coupon } from '../models/Coupon.js';

export const couponRepository = {
  findActiveByCode(code: string, now: Date, session?: ClientSession): Promise<Coupon | null> {
    return CouponModel.findOne({ code, active: true, expiresAt: { $gt: now } })
      .session(session ?? null)
      .lean<Coupon>()
      .exec();
  },

  /**
   * Atomically consumes one use, only if the coupon is still under its limit.
   * Returns false when the last use was taken by someone else.
   */
  async consumeUse(code: string, now: Date, session: ClientSession): Promise<boolean> {
    const result = await CouponModel.updateOne(
      {
        code,
        active: true,
        expiresAt: { $gt: now },
        $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
      },
      { $inc: { usedCount: 1 } },
      { session },
    ).exec();
    return result.modifiedCount === 1;
  },
};
