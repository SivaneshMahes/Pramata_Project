import type { AvailabilityDto, VehicleCalendarDto } from '@vrp/shared-types';
import { ErrorCode } from '@vrp/shared-types';
import { dateOnlyToUtc, rentalDays, utcToDateOnly } from '@vrp/validation';
import type { ClientSession, Types } from 'mongoose';
import { bookingRepository } from '../repositories/booking.repository.js';
import { vehicleRepository } from '../repositories/vehicle.repository.js';
import { AppError } from '../utils/AppError.js';
import { businessToday } from '../utils/clock.js';
import { assertValidRentalWindow } from './bookingRules.js';
import { couponService } from './coupon.service.js';
import { pricingService } from './pricing.service.js';

const MAX_CALENDAR_DAYS = 400;

/**
 * The one availability algorithm. Booking creation, the "Check availability"
 * button, date-filtered browsing and the calendar all go through here, so
 * they can never disagree about whether dates are free.
 */
export const availabilityService = {
  /** Returns a blocking booking that overlaps [start, end), if any. */
  findConflict(
    vehicleId: string | Types.ObjectId,
    startDate: string,
    endDate: string,
    session?: ClientSession,
  ) {
    return bookingRepository.findOverlapping(
      vehicleId,
      dateOnlyToUtc(startDate),
      dateOnlyToUtc(endDate),
      session,
    );
  },

  async check(
    vehicleId: string,
    startDate: string,
    endDate: string,
    couponCode?: string,
  ): Promise<AvailabilityDto> {
    const vehicle = await vehicleRepository.findLiveById(vehicleId);
    if (!vehicle) throw AppError.notFound('Vehicle');

    const totalDays = assertValidRentalWindow(startDate, endDate, businessToday());
    const subtotal = pricingService.calculateSubtotal(vehicle.dailyPrice, totalDays);
    const discount = couponCode ? await couponService.preview(couponCode, subtotal) : null;
    const base = {
      startDate,
      endDate,
      ...pricingService.quote(vehicle.dailyPrice, totalDays, discount),
    };

    if (!vehicle.isAvailable) return { ...base, available: false, reason: 'VEHICLE_UNAVAILABLE' };
    const conflict = await this.findConflict(vehicle._id, startDate, endDate);
    return conflict
      ? { ...base, available: false, reason: 'BOOKED' }
      : { ...base, available: true, reason: 'AVAILABLE' };
  },

  async calendar(vehicleId: string, from: string, to: string): Promise<VehicleCalendarDto> {
    if (rentalDays(from, to) > MAX_CALENDAR_DAYS) {
      throw AppError.badRequest(
        `Request at most ${MAX_CALENDAR_DAYS} days at a time.`,
        ErrorCode.INVALID_DATES,
      );
    }
    const vehicle = await vehicleRepository.findLiveById(vehicleId);
    if (!vehicle) throw AppError.notFound('Vehicle');

    const ranges = await bookingRepository.findBlockingRanges(
      vehicleId,
      dateOnlyToUtc(from),
      dateOnlyToUtc(to),
    );
    return {
      vehicleId,
      from,
      to,
      isAvailable: vehicle.isAvailable,
      bookedRanges: ranges.map((range) => ({
        startDate: utcToDateOnly(range.startDate),
        endDate: utcToDateOnly(range.endDate),
      })),
    };
  },

  /** Vehicles that have any blocking booking in [start, end). */
  bookedVehicleIds(startDate: string, endDate: string): Promise<Types.ObjectId[]> {
    return bookingRepository.distinctBookedVehicleIds(
      dateOnlyToUtc(startDate),
      dateOnlyToUtc(endDate),
    );
  },
};
