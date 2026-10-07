import type { ClientSession, Types } from 'mongoose';
import { ReviewModel } from '../models/Review.js';
import type { Review } from '../models/Review.js';

export type ReviewWithCustomer = Omit<Review, 'customer'> & {
  customer: { _id: Types.ObjectId; name: string };
};

export const reviewRepository = {
  async create(data: Partial<Review>, session: ClientSession): Promise<Types.ObjectId> {
    const [review] = await ReviewModel.create([data], { session });
    if (!review) throw new Error('Review insert returned no document');
    return review._id;
  },

  findById(id: string): Promise<Review | null> {
    return ReviewModel.findById(id).lean<Review>().exec();
  },

  findWithCustomerById(id: string | Types.ObjectId): Promise<ReviewWithCustomer | null> {
    return ReviewModel.findById(id)
      .populate<{ customer: ReviewWithCustomer['customer'] }>('customer', 'name')
      .lean<ReviewWithCustomer>()
      .exec();
  },

  findWithCustomerByBooking(bookingId: Types.ObjectId): Promise<ReviewWithCustomer | null> {
    return ReviewModel.findOne({ booking: bookingId })
      .populate<{ customer: ReviewWithCustomer['customer'] }>('customer', 'name')
      .lean<ReviewWithCustomer>()
      .exec();
  },

  existsForBooking(bookingId: Types.ObjectId, session?: ClientSession): Promise<boolean> {
    return ReviewModel.exists({ booking: bookingId })
      .session(session ?? null)
      .then(Boolean);
  },

  /** One query for a whole page of bookings — avoids N+1 "has review?" lookups. */
  async reviewedBookingIds(bookingIds: Types.ObjectId[]): Promise<Set<string>> {
    if (bookingIds.length === 0) return new Set();
    const rows = await ReviewModel.find({ booking: { $in: bookingIds } })
      .select('booking -_id')
      .lean<{ booking: Types.ObjectId }[]>()
      .exec();
    return new Set(rows.map((row) => row.booking.toString()));
  },

  async listForVehicle(
    vehicleId: string,
    skip: number,
    limit: number,
  ): Promise<{ items: ReviewWithCustomer[]; total: number }> {
    const filter = { vehicle: vehicleId };
    const [items, total] = await Promise.all([
      ReviewModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{ customer: ReviewWithCustomer['customer'] }>('customer', 'name')
        .lean<ReviewWithCustomer[]>()
        .exec(),
      ReviewModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },

  async update(
    id: string,
    data: { rating: number; comment: string },
    session: ClientSession,
  ): Promise<void> {
    await ReviewModel.updateOne(
      { _id: id },
      { $set: data },
      { session, runValidators: true },
    ).exec();
  },

  async ratingStats(
    vehicleId: Types.ObjectId,
    session: ClientSession,
  ): Promise<{ averageRating: number; reviewCount: number }> {
    const [stats] = await ReviewModel.aggregate<{ average: number; count: number }>([
      { $match: { vehicle: vehicleId } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ])
      .session(session)
      .exec();
    return {
      averageRating: stats ? Math.round(stats.average * 10) / 10 : 0,
      reviewCount: stats?.count ?? 0,
    };
  },
};
