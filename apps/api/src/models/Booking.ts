import { BOOKING_STATUSES, BookingStatus } from '@vrp/shared-types';
import type { BookingStatus as BookingStatusType } from '@vrp/shared-types';
import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

export interface StatusChange {
  status: BookingStatusType;
  at: Date;
  /** Null when the system changed the status (e.g. expiring stale requests). */
  by: Types.ObjectId | null;
}

export interface Booking {
  _id: Types.ObjectId;
  vehicle: Types.ObjectId;
  customer: Types.ObjectId;
  /** Denormalised from the vehicle so owner queries never need a join. */
  owner: Types.ObjectId;
  /** UTC midnight of the first rental day (inclusive). */
  startDate: Date;
  /** UTC midnight of the return day (exclusive): [startDate, endDate). */
  endDate: Date;
  totalDays: number;
  /** Price snapshot at booking time; later vehicle price changes never touch it. */
  dailyPrice: number;
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  totalAmount: number;
  status: BookingStatusType;
  statusHistory: StatusChange[];
  createdAt: Date;
  updatedAt: Date;
}

export type BookingDocument = HydratedDocument<Booking>;

const statusChangeSchema = new Schema<StatusChange>(
  {
    status: { type: String, enum: BOOKING_STATUSES, required: true },
    at: { type: Date, required: true },
    by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false },
);

const bookingSchema = new Schema<Booking>(
  {
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true, min: 1 },
    dailyPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, default: null },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: BOOKING_STATUSES, default: BookingStatus.PENDING },
    statusHistory: { type: [statusChangeSchema], default: [] },
  },
  { timestamps: true },
);

// Overlap checks: equality on vehicle, $in on status, range on dates.
bookingSchema.index({ vehicle: 1, status: 1, startDate: 1, endDate: 1 });
// Date-window filtering across vehicles on the browse page.
bookingSchema.index({ status: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ customer: 1, status: 1, startDate: -1 });
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, createdAt: -1 });

export const BookingModel = model<Booking>('Booking', bookingSchema);
