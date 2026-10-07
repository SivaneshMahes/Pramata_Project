import { Schema, model } from 'mongoose';

/**
 * Rate-limit counters live in MongoDB rather than process memory so the limit
 * holds across every ECS task behind the load balancer. A TTL index removes
 * expired windows automatically.
 */
export interface RateLimitHit {
  key: string;
  count: number;
  resetAt: Date;
}

const rateLimitHitSchema = new Schema<RateLimitHit>(
  {
    key: { type: String, required: true },
    count: { type: Number, required: true },
    resetAt: { type: Date, required: true },
  },
  { versionKey: false },
);

rateLimitHitSchema.index({ key: 1 }, { unique: true });
rateLimitHitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitHitModel = model<RateLimitHit>('RateLimitHit', rateLimitHitSchema);
