import { BookingStatus } from '@vrp/shared-types';
import type {
  BookingDetailDto,
  BookingDto,
  ReviewDto,
  UserDto,
  VehicleDto,
} from '@vrp/shared-types';
import { utcToDateOnly } from '@vrp/validation';
import type { PopulatedBooking } from '../repositories/booking.repository.js';
import type { ReviewWithCustomer } from '../repositories/review.repository.js';
import type { UserRecord } from '../repositories/user.repository.js';
import type { VehicleWithOwner } from '../repositories/vehicle.repository.js';

/** Explicit allow-list mapping: nothing reaches the client unless listed here. */
export function toUserDto(user: UserRecord): UserDto {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    authProvider: user.authProvider,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toVehicleDto(vehicle: VehicleWithOwner): VehicleDto {
  return {
    id: vehicle._id.toString(),
    owner: { id: vehicle.owner._id.toString(), name: vehicle.owner.name },
    name: vehicle.name,
    description: vehicle.description,
    images: vehicle.images.map((image) => ({
      url: image.url,
      ...(image.key ? { key: image.key } : {}),
    })),
    type: vehicle.type,
    registrationNumber: vehicle.registrationNumber,
    dailyPrice: vehicle.dailyPrice,
    location: vehicle.location,
    isAvailable: vehicle.isAvailable,
    features: vehicle.features,
    averageRating: vehicle.averageRating,
    reviewCount: vehicle.reviewCount,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export interface BookingMapContext {
  today: string;
  reviewedBookingIds?: Set<string>;
}

/** Customers may cancel a pending or approved booking before its first day. */
export function isCancellable(status: BookingStatus, startDate: string, today: string): boolean {
  return (
    (status === BookingStatus.PENDING || status === BookingStatus.APPROVED) && startDate > today
  );
}

export function toBookingDto(booking: PopulatedBooking, context: BookingMapContext): BookingDto {
  const startDate = utcToDateOnly(booking.startDate);
  return {
    id: booking._id.toString(),
    vehicle: {
      id: booking.vehicle._id.toString(),
      name: booking.vehicle.name,
      type: booking.vehicle.type,
      location: booking.vehicle.location,
      registrationNumber: booking.vehicle.registrationNumber,
      image: booking.vehicle.images[0]?.url ?? null,
    },
    customer: {
      id: booking.customer._id.toString(),
      name: booking.customer.name,
      email: booking.customer.email ?? '',
    },
    owner: { id: booking.owner._id.toString(), name: booking.owner.name },
    startDate,
    endDate: utcToDateOnly(booking.endDate),
    totalDays: booking.totalDays,
    dailyPrice: booking.dailyPrice,
    subtotal: booking.subtotal,
    discountAmount: booking.discountAmount,
    couponCode: booking.couponCode,
    totalAmount: booking.totalAmount,
    status: booking.status,
    hasReview: context.reviewedBookingIds?.has(booking._id.toString()) ?? false,
    canCancel: isCancellable(booking.status, startDate, context.today),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

export function toReviewDto(review: ReviewWithCustomer): ReviewDto {
  return {
    id: review._id.toString(),
    vehicle: review.vehicle.toString(),
    booking: review.booking.toString(),
    customer: { id: review.customer._id.toString(), name: review.customer.name },
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export function toBookingDetailDto(
  booking: PopulatedBooking,
  review: ReviewWithCustomer | null,
  today: string,
): BookingDetailDto {
  const reviewedBookingIds = new Set(review ? [booking._id.toString()] : []);
  return {
    ...toBookingDto(booking, { today, reviewedBookingIds }),
    review: review ? toReviewDto(review) : null,
  };
}
