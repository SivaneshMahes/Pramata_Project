import { BookingStatus, ErrorCode } from '@vrp/shared-types';
import type { Paginated, ReviewDto } from '@vrp/shared-types';
import type { CreateReviewInput, UpdateReviewInput } from '@vrp/validation';
import type { ClientSession, Types } from 'mongoose';
import { toReviewDto } from '../mappers/index.js';
import { bookingRepository } from '../repositories/booking.repository.js';
import { reviewRepository } from '../repositories/review.repository.js';
import { vehicleRepository } from '../repositories/vehicle.repository.js';
import type { AuthUser } from '../types/auth.js';
import { AppError } from '../utils/AppError.js';
import { isDuplicateKeyError } from '../utils/mongoErrors.js';
import { paginate, toSkip } from '../utils/pagination.js';
import type { PageRequest } from '../utils/pagination.js';
import { runInTransaction } from '../utils/transaction.js';

const reviewExists = () =>
  AppError.conflict(ErrorCode.REVIEW_EXISTS, 'You have already reviewed this rental.');

/** Recomputes the vehicle's rating from its reviews inside the same transaction. */
async function refreshVehicleRating(vehicleId: Types.ObjectId, session: ClientSession) {
  const stats = await reviewRepository.ratingStats(vehicleId, session);
  await vehicleRepository.updateRating(vehicleId, stats.averageRating, stats.reviewCount, session);
}

async function loadDto(id: Types.ObjectId | string): Promise<ReviewDto> {
  const review = await reviewRepository.findWithCustomerById(id);
  if (!review) throw AppError.notFound('Review');
  return toReviewDto(review);
}

export const reviewService = {
  async create(customer: AuthUser, input: CreateReviewInput): Promise<ReviewDto> {
    const booking = await bookingRepository.findById(input.booking);
    // Someone else's booking is indistinguishable from a missing one.
    if (!booking || !booking.customer.equals(customer.id)) throw AppError.notFound('Booking');
    if (input.vehicle && !booking.vehicle.equals(input.vehicle)) {
      throw AppError.badRequest(
        'This booking is for a different vehicle.',
        ErrorCode.REVIEW_NOT_ALLOWED,
      );
    }
    if (booking.status !== BookingStatus.RETURNED) {
      throw AppError.conflict(
        ErrorCode.REVIEW_NOT_ALLOWED,
        'You can review a rental once the vehicle has been returned.',
      );
    }

    try {
      const reviewId = await runInTransaction(async (session) => {
        if (await reviewRepository.existsForBooking(booking._id, session)) throw reviewExists();
        const id = await reviewRepository.create(
          {
            vehicle: booking.vehicle,
            customer: booking.customer,
            booking: booking._id,
            rating: input.rating,
            comment: input.comment,
          },
          session,
        );
        await refreshVehicleRating(booking.vehicle, session);
        return id;
      });
      return loadDto(reviewId);
    } catch (error) {
      // The unique index on `booking` is the final word on duplicates.
      if (isDuplicateKeyError(error)) throw reviewExists();
      throw error;
    }
  },

  async update(customer: AuthUser, id: string, input: UpdateReviewInput): Promise<ReviewDto> {
    const review = await reviewRepository.findById(id);
    if (!review) throw AppError.notFound('Review');
    if (!review.customer.equals(customer.id)) {
      throw AppError.forbidden('You can only edit your own reviews.');
    }
    await runInTransaction(async (session) => {
      await reviewRepository.update(id, input, session);
      await refreshVehicleRating(review.vehicle, session);
    });
    return loadDto(review._id);
  },

  async listForVehicle(vehicleId: string, page: PageRequest): Promise<Paginated<ReviewDto>> {
    const vehicle = await vehicleRepository.findLiveById(vehicleId);
    if (!vehicle) throw AppError.notFound('Vehicle');
    const { items, total } = await reviewRepository.listForVehicle(
      vehicleId,
      toSkip(page),
      page.limit,
    );
    return paginate(items.map(toReviewDto), page, total);
  },
};
