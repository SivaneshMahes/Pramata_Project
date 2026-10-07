import { BOOKING_SCOPE_STATUSES, BookingStatus, ErrorCode } from '@vrp/shared-types';
import type {
  BookingDetailDto,
  BookingDto,
  BookingScope,
  BookingStatus as BookingStatusType,
  CustomerSummaryDto,
  Paginated,
} from '@vrp/shared-types';
import type { CreateBookingInput, MyBookingsQuery, OwnerBookingsQuery } from '@vrp/validation';
import { dateOnlyToUtc, utcToDateOnly } from '@vrp/validation';
import { Types } from 'mongoose';
import type { FilterQuery } from 'mongoose';
import { isCancellable, toBookingDetailDto, toBookingDto } from '../mappers/index.js';
import type { Booking } from '../models/Booking.js';
import { bookingRepository } from '../repositories/booking.repository.js';
import type { PopulatedBooking } from '../repositories/booking.repository.js';
import { reviewRepository } from '../repositories/review.repository.js';
import { vehicleRepository } from '../repositories/vehicle.repository.js';
import type { AuthUser } from '../types/auth.js';
import { AppError } from '../utils/AppError.js';
import { businessToday } from '../utils/clock.js';
import { paginate, toSkip } from '../utils/pagination.js';
import { runInTransaction } from '../utils/transaction.js';
import { availabilityService } from './availability.service.js';
import { assertValidRentalWindow } from './bookingRules.js';
import { assertTransition } from './bookingStateMachine.js';
import { bookingEvents } from './bookingEvents.js';
import { couponService } from './coupon.service.js';
import { pricingService } from './pricing.service.js';

const SCOPE_SORT: Record<BookingScope, Record<string, 1 | -1>> = {
  upcoming: { startDate: 1 },
  active: { endDate: 1 },
  previous: { startDate: -1 },
};

/** Booking is private: anyone but its customer or owner gets a plain 404. */
const bookingNotFound = () => AppError.notFound('Booking');

async function withReviewFlags(items: PopulatedBooking[], today: string): Promise<BookingDto[]> {
  const returnedIds = items
    .filter((item) => item.status === BookingStatus.RETURNED)
    .map((item) => item._id);
  const reviewedBookingIds = await reviewRepository.reviewedBookingIds(returnedIds);
  return items.map((item) => toBookingDto(item, { today, reviewedBookingIds }));
}

async function loadDetail(id: Types.ObjectId | string, today: string): Promise<BookingDetailDto> {
  const booking = await bookingRepository.findPopulatedById(id);
  if (!booking) throw bookingNotFound();
  const review = await reviewRepository.findWithCustomerByBooking(booking._id);
  return toBookingDetailDto(booking, review, today);
}

export const bookingService = {
  /**
   * Creates a booking. Everything the price depends on is read from the
   * database inside a transaction that first writes the vehicle document, so
   * two customers racing for overlapping dates are serialised and the second
   * one sees the first booking and gets a 409.
   */
  async create(customer: AuthUser, input: CreateBookingInput): Promise<BookingDetailDto> {
    const today = businessToday();
    const totalDays = assertValidRentalWindow(input.startDate, input.endDate, today);
    const customerId = new Types.ObjectId(customer.id);

    const bookingId = await runInTransaction(async (session) => {
      const vehicle = await vehicleRepository.lockForBooking(input.vehicle, session);
      if (!vehicle) throw AppError.notFound('Vehicle');
      if (vehicle.owner.equals(customerId)) {
        throw AppError.forbidden('You cannot rent your own vehicle.');
      }
      if (!vehicle.isAvailable) {
        throw AppError.conflict(
          ErrorCode.VEHICLE_UNAVAILABLE,
          'This vehicle is not accepting bookings right now.',
        );
      }

      const conflict = await availabilityService.findConflict(
        vehicle._id,
        input.startDate,
        input.endDate,
        session,
      );
      if (conflict) {
        throw AppError.conflict(
          ErrorCode.BOOKING_CONFLICT,
          'Vehicle is already booked for the selected dates.',
        );
      }

      const subtotal = pricingService.calculateSubtotal(vehicle.dailyPrice, totalDays);
      const discount = input.couponCode
        ? await couponService.redeem(input.couponCode, subtotal, session)
        : null;
      const price = pricingService.quote(vehicle.dailyPrice, totalDays, discount);

      return bookingRepository.create(
        {
          vehicle: vehicle._id,
          customer: customerId,
          owner: vehicle.owner,
          startDate: dateOnlyToUtc(input.startDate),
          endDate: dateOnlyToUtc(input.endDate),
          totalDays: price.totalDays,
          dailyPrice: price.dailyPrice,
          subtotal: price.subtotal,
          discountAmount: price.discountAmount,
          couponCode: price.couponCode,
          totalAmount: price.totalAmount,
          status: BookingStatus.PENDING,
          statusHistory: [{ status: BookingStatus.PENDING, at: new Date(), by: customerId }],
        },
        session,
      );
    });

    const detail = await loadDetail(bookingId, today);
    bookingEvents.publish('booking.created', detail);
    return detail;
  },

  async getForUser(user: AuthUser, id: string): Promise<BookingDetailDto> {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw bookingNotFound();
    const isParty = booking.customer.equals(user.id) || booking.owner.equals(user.id);
    if (!isParty) throw bookingNotFound();
    return loadDetail(booking._id, businessToday());
  },

  async listForCustomer(
    customerId: string,
    query: MyBookingsQuery,
  ): Promise<Paginated<BookingDto>> {
    const filter: FilterQuery<Booking> = { customer: new Types.ObjectId(customerId) };
    if (query.scope) filter.status = { $in: BOOKING_SCOPE_STATUSES[query.scope] };
    const sort = query.scope ? SCOPE_SORT[query.scope] : { createdAt: -1 as const };

    const { items, total } = await bookingRepository.listPopulated(
      filter,
      sort,
      toSkip(query),
      query.limit,
    );
    return paginate(await withReviewFlags(items, businessToday()), query, total);
  },

  async customerSummary(customerId: string): Promise<CustomerSummaryDto> {
    const { counts, totalSpent } = await bookingRepository.customerSummary(
      new Types.ObjectId(customerId),
    );
    const sum = (statuses: readonly BookingStatusType[]) =>
      statuses.reduce((total, status) => total + (counts[status] ?? 0), 0);
    return {
      upcoming: sum(BOOKING_SCOPE_STATUSES.upcoming),
      active: sum(BOOKING_SCOPE_STATUSES.active),
      completed: counts.RETURNED ?? 0,
      totalSpent,
    };
  },

  async listForOwner(ownerId: string, query: OwnerBookingsQuery): Promise<Paginated<BookingDto>> {
    const filter: FilterQuery<Booking> = { owner: new Types.ObjectId(ownerId) };
    if (query.status) filter.status = query.status;
    if (query.vehicle) filter.vehicle = new Types.ObjectId(query.vehicle);

    const { items, total } = await bookingRepository.listPopulated(
      filter,
      { createdAt: -1 },
      toSkip(query),
      query.limit,
    );
    return paginate(await withReviewFlags(items, businessToday()), query, total);
  },

  async cancel(customer: AuthUser, id: string): Promise<BookingDetailDto> {
    const booking = await bookingRepository.findById(id);
    if (!booking || !booking.customer.equals(customer.id)) throw bookingNotFound();

    assertTransition(booking.status, BookingStatus.CANCELLED);
    const today = businessToday();
    if (!isCancellable(booking.status, utcToDateOnly(booking.startDate), today)) {
      throw AppError.conflict(
        ErrorCode.BOOKING_NOT_CANCELLABLE,
        'Bookings can only be cancelled before the rental starts.',
      );
    }
    return this.applyTransition(booking, BookingStatus.CANCELLED, customer.id, today);
  },

  approve(owner: AuthUser, id: string) {
    return this.ownerTransition(owner, id, BookingStatus.APPROVED);
  },

  reject(owner: AuthUser, id: string) {
    return this.ownerTransition(owner, id, BookingStatus.REJECTED);
  },

  handOver(owner: AuthUser, id: string) {
    return this.ownerTransition(owner, id, BookingStatus.HANDED_OVER);
  },

  markReturned(owner: AuthUser, id: string) {
    return this.ownerTransition(owner, id, BookingStatus.RETURNED);
  },

  async ownerTransition(
    owner: AuthUser,
    id: string,
    to: BookingStatusType,
  ): Promise<BookingDetailDto> {
    const booking = await bookingRepository.findById(id);
    if (!booking || !booking.owner.equals(owner.id)) throw bookingNotFound();

    assertTransition(booking.status, to);
    const today = businessToday();
    const startDate = utcToDateOnly(booking.startDate);
    if (to === BookingStatus.APPROVED && startDate < today) {
      throw AppError.conflict(
        ErrorCode.INVALID_STATUS_TRANSITION,
        'This request has expired because its start date has passed.',
      );
    }
    if (to === BookingStatus.HANDED_OVER && startDate > today) {
      throw AppError.conflict(
        ErrorCode.INVALID_STATUS_TRANSITION,
        `The vehicle can be handed over from ${startDate}.`,
      );
    }
    return this.applyTransition(booking, to, owner.id, today);
  },

  async applyTransition(
    booking: Booking,
    to: BookingStatusType,
    actorId: string,
    today: string,
  ): Promise<BookingDetailDto> {
    const updated = await bookingRepository.updateStatusIfCurrent(
      booking._id.toString(),
      booking.status,
      to,
      actorId,
    );
    if (!updated) {
      throw AppError.conflict(
        ErrorCode.INVALID_STATUS_TRANSITION,
        'This booking was just updated. Refresh to see its current status.',
      );
    }
    const detail = await loadDetail(updated._id, today);
    bookingEvents.publish(EVENT_FOR_STATUS[to], detail);
    return detail;
  },
};

const EVENT_FOR_STATUS = {
  PENDING: 'booking.created',
  APPROVED: 'booking.approved',
  REJECTED: 'booking.rejected',
  CANCELLED: 'booking.cancelled',
  HANDED_OVER: 'booking.handed_over',
  RETURNED: 'booking.returned',
} as const satisfies Record<BookingStatusType, string>;
