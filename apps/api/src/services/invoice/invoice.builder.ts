import { BookingStatus } from '@vrp/shared-types';
import type { BookingDetailDto } from '@vrp/shared-types';

/** Renderer-independent invoice model; a PDF, HTML or email renderer consumes it. */
export interface Invoice {
  number: string;
  issuedOn: string;
  bookingId: string;
  status: string;
  customer: { name: string; email: string };
  owner: { name: string };
  vehicle: { name: string; registrationNumber: string; location: string };
  period: { startDate: string; endDate: string; days: number };
  lines: { description: string; quantity: number; unitPrice: number; amount: number }[];
  subtotal: number;
  discount: { code: string | null; amount: number };
  total: number;
  currency: 'INR';
}

/** Invoices exist once the owner has confirmed the rental. */
export const INVOICEABLE_STATUSES: readonly string[] = [
  BookingStatus.APPROVED,
  BookingStatus.HANDED_OVER,
  BookingStatus.RETURNED,
];

export function buildInvoice(booking: BookingDetailDto, issuedOn: string): Invoice {
  return {
    number: `INV-${booking.createdAt.slice(0, 7).replace('-', '')}-${booking.id.slice(-8).toUpperCase()}`,
    issuedOn,
    bookingId: booking.id,
    status: booking.status,
    customer: { name: booking.customer.name, email: booking.customer.email },
    owner: { name: booking.owner.name },
    vehicle: {
      name: booking.vehicle.name,
      registrationNumber: booking.vehicle.registrationNumber,
      location: booking.vehicle.location,
    },
    period: { startDate: booking.startDate, endDate: booking.endDate, days: booking.totalDays },
    lines: [
      {
        description: `${booking.vehicle.name} rental (${booking.startDate} to ${booking.endDate})`,
        quantity: booking.totalDays,
        unitPrice: booking.dailyPrice,
        amount: booking.subtotal,
      },
    ],
    subtotal: booking.subtotal,
    discount: { code: booking.couponCode, amount: booking.discountAmount },
    total: booking.totalAmount,
    currency: 'INR',
  };
}
