import { BOOKING_SCOPES, BOOKING_STATUSES } from '@vrp/shared-types';
import { z } from 'zod';
import { dateOnlySchema, objectIdSchema, optionalQuery, paginationQuerySchema } from './common.js';

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,24}$/, 'Coupon codes use 3–24 letters or numbers');

/**
 * The client sends only *what* it wants to rent and *when*. Days, price and
 * totals are computed on the server from the stored vehicle.
 */
export const createBookingSchema = z
  .object({
    vehicle: objectIdSchema,
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    couponCode: optionalQuery(couponCodeSchema),
  })
  .refine((value) => value.endDate > value.startDate, {
    path: ['endDate'],
    message: 'End date must be after start date',
  });
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const myBookingsQuerySchema = paginationQuerySchema.extend({
  scope: optionalQuery(z.enum(BOOKING_SCOPES)),
});
export type MyBookingsQuery = z.infer<typeof myBookingsQuerySchema>;

export const ownerBookingsQuerySchema = paginationQuerySchema.extend({
  status: optionalQuery(z.enum(BOOKING_STATUSES)),
  vehicle: optionalQuery(objectIdSchema),
});
export type OwnerBookingsQuery = z.infer<typeof ownerBookingsQuerySchema>;

export const quoteQuerySchema = z
  .object({
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    couponCode: optionalQuery(couponCodeSchema),
  })
  .refine((value) => value.endDate > value.startDate, {
    path: ['endDate'],
    message: 'End date must be after start date',
  });
export type QuoteQuery = z.infer<typeof quoteQuerySchema>;
