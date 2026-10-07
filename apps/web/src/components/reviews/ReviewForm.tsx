import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { updateReviewSchema } from '@/schemas';
import type { UpdateReviewInput } from '@vrp/validation';
import { errorMessage } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import { useReviewMutations } from '@/hooks/useReviews';
import type { ReviewDto } from '@/types';
import { Button } from '../common/Button';
import { Field } from '../common/Field';
import { Textarea } from '../common/Input';
import { StarRatingInput } from '../common/StarRating';

interface ReviewFormProps {
  bookingId: string;
  vehicleId: string;
  existing?: ReviewDto | null;
  onDone: () => void;
  onCancel?: () => void;
}

type FormInput = z.input<typeof updateReviewSchema>;

/** Same form for writing and editing; the server re-checks eligibility. */
export function ReviewForm({ bookingId, vehicleId, existing, onDone, onCancel }: ReviewFormProps) {
  const { create, update } = useReviewMutations();
  const toast = useToast();
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, UpdateReviewInput>({
    resolver: zodResolver(updateReviewSchema),
    defaultValues: { rating: existing?.rating ?? 0, comment: existing?.comment ?? '' },
  });
  const comment = watch('comment') ?? '';

  const submit = handleSubmit(async (values) => {
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, input: values });
        toast.success('Review updated');
      } else {
        await create.mutateAsync({ booking: bookingId, vehicle: vehicleId, ...values });
        toast.success('Thanks for your review');
      }
      onDone();
    } catch (error) {
      toast.error('Couldn’t save your review', errorMessage(error));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Controller
        control={control}
        name="rating"
        render={({ field }) => (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Your rating</span>
            <StarRatingInput
              name="rating"
              value={Number(field.value) || 0}
              onChange={field.onChange}
              invalid={Boolean(errors.rating)}
            />
            {errors.rating && (
              <p className="text-xs font-medium text-danger">{errors.rating.message}</p>
            )}
          </div>
        )}
      />
      <Field
        label="Comments"
        optional
        error={errors.comment?.message}
        hint={`${comment.length}/1000`}
      >
        <Textarea
          {...register('comment')}
          rows={3}
          maxLength={1000}
          placeholder="How was the vehicle and the pickup?"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          {existing ? 'Save changes' : 'Submit review'}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
