import { z } from 'zod';
import { objectIdSchema } from './common.js';

export const ratingSchema = z.coerce
  .number('Choose a rating')
  .int('Choose a rating')
  .min(1, 'Choose a rating from 1 to 5')
  .max(5, 'Choose a rating from 1 to 5');

export const reviewCommentSchema = z
  .string()
  .trim()
  .max(1000, 'Keep the review under 1000 characters')
  .default('');

export const createReviewSchema = z.object({
  booking: objectIdSchema,
  /** Optional cross-check: if provided it must match the booking's vehicle. */
  vehicle: objectIdSchema.optional(),
  rating: ratingSchema,
  comment: reviewCommentSchema,
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  rating: ratingSchema,
  comment: reviewCommentSchema,
});
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
