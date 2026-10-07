import type { BookingDetailDto, NotificationEventType } from '@vrp/shared-types';
import { logger } from '../config/logger.js';

export type BookingEventListener = (type: NotificationEventType, booking: BookingDetailDto) => void;

const listeners = new Set<BookingEventListener>();

/**
 * In-process domain events for the booking lifecycle. Services publish after a
 * change is committed; listeners (audit log, real-time notifications) react.
 * A listener failure never fails the request that caused the event. Moving to
 * EventBridge/SQS later means adding one listener that forwards events.
 */
export const bookingEvents = {
  subscribe(listener: BookingEventListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  publish(type: NotificationEventType, booking: BookingDetailDto): void {
    for (const listener of listeners) {
      try {
        listener(type, booking);
      } catch (error) {
        logger.error({ err: error, type, bookingId: booking.id }, 'Booking event listener failed');
      }
    }
  },
};

// Audit trail: every lifecycle change becomes one structured log line.
bookingEvents.subscribe((type, booking) => {
  logger.info(
    {
      event: type,
      bookingId: booking.id,
      vehicleId: booking.vehicle.id,
      customerId: booking.customer.id,
      ownerId: booking.owner.id,
      status: booking.status,
    },
    'booking event',
  );
});
