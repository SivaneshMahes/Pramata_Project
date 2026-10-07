import { BLOCKING_BOOKING_STATUSES, BookingStatus } from '@vrp/shared-types';
import type { BookingStatus as BookingStatusType, VehicleType } from '@vrp/shared-types';
import { Types } from 'mongoose';
import type { ClientSession, FilterQuery } from 'mongoose';
import { BookingModel } from '../models/Booking.js';
import type { Booking } from '../models/Booking.js';
import type { VehicleImage } from '../models/Vehicle.js';

export interface BookingVehicleRef {
  _id: Types.ObjectId;
  name: string;
  type: VehicleType;
  location: string;
  registrationNumber: string;
  images: VehicleImage[];
}

export interface BookingPersonRef {
  _id: Types.ObjectId;
  name: string;
  email?: string;
}

export type PopulatedBooking = Omit<Booking, 'vehicle' | 'customer' | 'owner'> & {
  vehicle: BookingVehicleRef;
  customer: BookingPersonRef;
  owner: BookingPersonRef;
};

/**
 * THE overlap predicate. Bookings occupy [startDate, endDate); two ranges
 * conflict when existing.start < requested.end AND existing.end > requested.start.
 * Only blocking statuses hold dates. Every availability path uses this.
 */
export function overlapFilter(start: Date, end: Date): FilterQuery<Booking> {
  return {
    status: { $in: BLOCKING_BOOKING_STATUSES },
    startDate: { $lt: end },
    endDate: { $gt: start },
  };
}

const BOOKING_POPULATE = [
  { path: 'vehicle', select: 'name type location registrationNumber images' },
  { path: 'customer', select: 'name email' },
  { path: 'owner', select: 'name' },
];

export const bookingRepository = {
  findOverlapping(
    vehicleId: string | Types.ObjectId,
    start: Date,
    end: Date,
    session?: ClientSession,
  ): Promise<Pick<Booking, '_id' | 'startDate' | 'endDate' | 'status'> | null> {
    return BookingModel.findOne({ vehicle: vehicleId, ...overlapFilter(start, end) })
      .select('_id startDate endDate status')
      .session(session ?? null)
      .lean<Pick<Booking, '_id' | 'startDate' | 'endDate' | 'status'>>()
      .exec();
  },

  findBlockingRanges(
    vehicleId: string,
    from: Date,
    to: Date,
  ): Promise<Pick<Booking, 'startDate' | 'endDate'>[]> {
    return BookingModel.find({ vehicle: vehicleId, ...overlapFilter(from, to) })
      .select('startDate endDate -_id')
      .sort({ startDate: 1 })
      .limit(500)
      .lean<Pick<Booking, 'startDate' | 'endDate'>[]>()
      .exec();
  },

  /** Vehicles with any blocking booking in the window (for date-filtered browsing). */
  distinctBookedVehicleIds(start: Date, end: Date): Promise<Types.ObjectId[]> {
    return BookingModel.distinct('vehicle', overlapFilter(start, end)).exec() as Promise<
      Types.ObjectId[]
    >;
  },

  async create(data: Partial<Booking>, session: ClientSession): Promise<Types.ObjectId> {
    const [booking] = await BookingModel.create([data], { session });
    if (!booking) throw new Error('Booking insert returned no document');
    return booking._id;
  },

  findById(id: string): Promise<Booking | null> {
    return BookingModel.findById(id).lean<Booking>().exec();
  },

  findPopulatedById(id: string | Types.ObjectId): Promise<PopulatedBooking | null> {
    return BookingModel.findById(id).populate(BOOKING_POPULATE).lean<PopulatedBooking>().exec();
  },

  async listPopulated(
    filter: FilterQuery<Booking>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number,
  ): Promise<{ items: PopulatedBooking[]; total: number }> {
    const [items, total] = await Promise.all([
      BookingModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(BOOKING_POPULATE)
        .lean<PopulatedBooking[]>()
        .exec(),
      BookingModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },

  findPopulated(
    filter: FilterQuery<Booking>,
    sort: Record<string, 1 | -1>,
    limit: number,
  ): Promise<PopulatedBooking[]> {
    return BookingModel.find(filter)
      .sort(sort)
      .limit(limit)
      .populate(BOOKING_POPULATE)
      .lean<PopulatedBooking[]>()
      .exec();
  },

  /**
   * Compare-and-set status change. If another request changed the booking
   * first, the filter misses and null is returned instead of overwriting.
   */
  updateStatusIfCurrent(
    id: string,
    from: BookingStatusType,
    to: BookingStatusType,
    actorId: string | null,
  ): Promise<Booking | null> {
    return BookingModel.findOneAndUpdate(
      { _id: id, status: from },
      {
        $set: { status: to },
        $push: {
          statusHistory: {
            status: to,
            at: new Date(),
            by: actorId ? new Types.ObjectId(actorId) : null,
          },
        },
      },
      { new: true },
    )
      .lean<Booking>()
      .exec();
  },

  existsBlockingForVehicle(vehicleId: Types.ObjectId, session?: ClientSession): Promise<boolean> {
    return BookingModel.exists({
      vehicle: vehicleId,
      status: { $in: BLOCKING_BOOKING_STATUSES },
    })
      .session(session ?? null)
      .then(Boolean);
  },

  countByFilter(filter: FilterQuery<Booking>): Promise<number> {
    return BookingModel.countDocuments(filter).exec();
  },

  async customerSummary(customerId: Types.ObjectId): Promise<{
    counts: Partial<Record<BookingStatusType, number>>;
    totalSpent: number;
  }> {
    const rows = await BookingModel.aggregate<{
      _id: BookingStatusType;
      count: number;
      amount: number;
    }>([
      { $match: { customer: customerId } },
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
    ]).exec();
    const counts: Partial<Record<BookingStatusType, number>> = {};
    let totalSpent = 0;
    for (const row of rows) {
      counts[row._id] = row.count;
      if (row._id === BookingStatus.RETURNED || row._id === BookingStatus.HANDED_OVER) {
        totalSpent += row.amount;
      }
    }
    return { counts, totalSpent };
  },

  async ownerRevenue(
    ownerId: Types.ObjectId,
    since: Date,
  ): Promise<{
    total: number;
    monthly: { month: string; revenue: number }[];
  }> {
    const earning = [BookingStatus.HANDED_OVER, BookingStatus.RETURNED];
    const [result] = await BookingModel.aggregate<{
      total: { revenue: number }[];
      monthly: { _id: string; revenue: number }[];
    }>([
      { $match: { owner: ownerId, status: { $in: earning } } },
      {
        $facet: {
          total: [{ $group: { _id: null, revenue: { $sum: '$totalAmount' } } }],
          monthly: [
            { $match: { startDate: { $gte: since } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$startDate' } },
                revenue: { $sum: '$totalAmount' },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]).exec();
    return {
      total: result?.total[0]?.revenue ?? 0,
      monthly: (result?.monthly ?? []).map((row) => ({ month: row._id, revenue: row.revenue })),
    };
  },

  /** Requests nobody acted on before the start date can no longer be honoured. */
  async rejectStalePending(today: Date): Promise<number> {
    const result = await BookingModel.updateMany(
      { status: BookingStatus.PENDING, startDate: { $lt: today } },
      {
        $set: { status: BookingStatus.REJECTED },
        $push: { statusHistory: { status: BookingStatus.REJECTED, at: new Date(), by: null } },
      },
    ).exec();
    return result.modifiedCount;
  },
};
