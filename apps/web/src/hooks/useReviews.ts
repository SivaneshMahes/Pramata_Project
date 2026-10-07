import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateReviewInput, UpdateReviewInput } from '@vrp/validation';
import { queryKeys } from '@/constants/queryKeys';
import { reviewService } from '@/services/review.service';
import type { ReviewDto } from '@/types';

export function useReviewMutations() {
  const queryClient = useQueryClient();
  const refresh = (review: ReviewDto) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(review.booking) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.detail(review.vehicle) });
    void queryClient.invalidateQueries({ queryKey: ['vehicles', 'reviews', review.vehicle] });
  };
  return {
    create: useMutation({
      mutationFn: (input: CreateReviewInput) => reviewService.create(input),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateReviewInput }) =>
        reviewService.update(id, input),
      onSuccess: refresh,
    }),
  };
}
