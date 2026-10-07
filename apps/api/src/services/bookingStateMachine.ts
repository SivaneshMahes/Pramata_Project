import { canTransition, ErrorCode } from '@vrp/shared-types';
import type { BookingStatus } from '@vrp/shared-types';
import { AppError } from '../utils/AppError.js';

const LABELS: Record<BookingStatus, string> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  HANDED_OVER: 'handed-over',
  RETURNED: 'returned',
};

/**
 * Central guard for the booking lifecycle. The legal transitions live in
 * BOOKING_TRANSITIONS (shared with the UI); this turns a violation into a 409.
 */
export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw AppError.conflict(
      ErrorCode.INVALID_STATUS_TRANSITION,
      `A ${LABELS[from]} booking cannot be marked as ${LABELS[to]}.`,
    );
  }
}
