import type { CreateReviewInput, UpdateReviewInput } from '@vrp/validation';
import { http, unwrap } from '@/api/client';
import type { ReviewDto } from '@/types';

export const reviewService = {
  create: (input: CreateReviewInput) => unwrap<ReviewDto>(http.post('/reviews', input)),
  update: (id: string, input: UpdateReviewInput) =>
    unwrap<ReviewDto>(http.put(`/reviews/${id}`, input)),
};
