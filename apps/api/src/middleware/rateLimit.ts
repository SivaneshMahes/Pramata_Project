import { ErrorCode } from '@vrp/shared-types';
import { rateLimit } from 'express-rate-limit';
import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit';
import { env } from '../config/env.js';
import { RateLimitHitModel } from '../models/RateLimitHit.js';

/**
 * express-rate-limit store backed by MongoDB, so every ECS task enforces the
 * same shared counter. One atomic upsert per request; expired windows reset
 * in the same operation and are garbage-collected by a TTL index.
 */
class MongoRateLimitStore implements Store {
  private windowMs = 60_000;
  // Keys are namespaced per limiter so auth and general limits don't collide.
  constructor(public readonly prefix: string) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = new Date();
    const expired = {
      $or: [{ $eq: [{ $type: '$resetAt' }, 'missing'] }, { $lte: ['$resetAt', now] }],
    };
    const doc = await RateLimitHitModel.collection.findOneAndUpdate(
      { key: this.prefix + key },
      [
        {
          $set: {
            count: { $cond: [expired, 1, { $add: ['$count', 1] }] },
            resetAt: { $cond: [expired, new Date(now.getTime() + this.windowMs), '$resetAt'] },
          },
        },
      ],
      { upsert: true, returnDocument: 'after' },
    );
    return { totalHits: (doc?.count as number) ?? 1, resetTime: doc?.resetAt as Date | undefined };
  }

  async decrement(key: string): Promise<void> {
    await RateLimitHitModel.updateOne(
      { key: this.prefix + key, count: { $gt: 0 } },
      { $inc: { count: -1 } },
    );
  }

  async resetKey(key: string): Promise<void> {
    await RateLimitHitModel.deleteOne({ key: this.prefix + key });
  }
}

function createLimiter(prefix: string, limit: number) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    store: new MongoRateLimitStore(prefix),
    // If the store is unreachable, prefer serving traffic over failing closed.
    passOnStoreError: true,
    skip: () => !env.RATE_LIMIT_ENABLED,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        code: ErrorCode.RATE_LIMITED,
        message: 'Too many requests. Please wait a moment and try again.',
      });
    },
  });
}

export const apiRateLimiter = createLimiter('api:', env.RATE_LIMIT_MAX);
/** Tighter limit on credential endpoints to slow down password guessing. */
export const authRateLimiter = createLimiter('auth:', env.AUTH_RATE_LIMIT_MAX);
