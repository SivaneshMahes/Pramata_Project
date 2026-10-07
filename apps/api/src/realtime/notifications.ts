import type {
  BookingDetailDto,
  NotificationEventDto,
  NotificationEventType,
} from '@vrp/shared-types';

/** Who hears about each lifecycle change: the party that didn't cause it. */
const AUDIENCE: Record<NotificationEventType, 'owner' | 'customer'> = {
  'booking.created': 'owner',
  'booking.cancelled': 'owner',
  'booking.approved': 'customer',
  'booking.rejected': 'customer',
  'booking.handed_over': 'customer',
  'booking.returned': 'customer',
};

const MESSAGES: Record<NotificationEventType, (b: BookingDetailDto) => string> = {
  'booking.created': (b) =>
    `${b.customer.name} requested ${b.vehicle.name} for ${b.startDate} → ${b.endDate}.`,
  'booking.cancelled': (b) => `${b.customer.name} cancelled their ${b.vehicle.name} booking.`,
  'booking.approved': (b) => `Your ${b.vehicle.name} booking from ${b.startDate} is confirmed.`,
  'booking.rejected': (b) => `Your ${b.vehicle.name} request was declined.`,
  'booking.handed_over': (b) => `Enjoy the drive — ${b.vehicle.name} is marked as picked up.`,
  'booking.returned': (b) => `${b.vehicle.name} is returned. How was it? Leave a review.`,
};

export const userRoom = (userId: string) => `user:${userId}`;

export function buildNotification(
  type: NotificationEventType,
  booking: BookingDetailDto,
): { recipientId: string; event: NotificationEventDto } {
  const recipientId = AUDIENCE[type] === 'owner' ? booking.owner.id : booking.customer.id;
  return {
    recipientId,
    event: {
      type,
      bookingId: booking.id,
      vehicleName: booking.vehicle.name,
      status: booking.status,
      message: MESSAGES[type](booking),
      occurredAt: new Date().toISOString(),
    },
  };
}
