import { BOOKING_LIMITS, ErrorCode } from '@vrp/shared-types';
import { addDays, rentalDays } from '@vrp/validation';
import { AppError } from '../utils/AppError.js';

const invalidDates = (message: string) => AppError.badRequest(message, ErrorCode.INVALID_DATES);

/**
 * Validates a requested rental window against business rules and returns the
 * number of rental days. Dates are YYYY-MM-DD; the window is [start, end).
 */
export function assertValidRentalWindow(startDate: string, endDate: string, today: string): number {
  if (startDate < today) {
    throw invalidDates('The start date cannot be in the past.');
  }
  if (endDate <= startDate) {
    throw invalidDates('The end date must be after the start date.');
  }
  if (startDate > addDays(today, BOOKING_LIMITS.MAX_ADVANCE_DAYS)) {
    throw invalidDates(
      `Bookings can be made up to ${BOOKING_LIMITS.MAX_ADVANCE_DAYS} days in advance.`,
    );
  }
  const days = rentalDays(startDate, endDate);
  if (days > BOOKING_LIMITS.MAX_RENTAL_DAYS) {
    throw invalidDates(`A single rental can last at most ${BOOKING_LIMITS.MAX_RENTAL_DAYS} days.`);
  }
  return days;
}
