import type { Types } from 'mongoose';
import type { ClientSession, FilterQuery, SortOrder } from 'mongoose';
import { VehicleModel } from '../models/Vehicle.js';
import type { Vehicle, VehicleDocument } from '../models/Vehicle.js';

export interface OwnerRef {
  _id: Types.ObjectId;
  name: string;
}

export type VehicleWithOwner = Omit<Vehicle, 'owner' | 'searchTokens' | 'bookingVersion'> & {
  owner: OwnerRef;
};

const OWNER_FIELDS = 'name';

export const vehicleRepository = {
  async list(
    filter: FilterQuery<Vehicle>,
    sort: Record<string, SortOrder>,
    skip: number,
    limit: number,
  ): Promise<{ items: VehicleWithOwner[]; total: number }> {
    const [items, total] = await Promise.all([
      VehicleModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate<{ owner: OwnerRef }>('owner', OWNER_FIELDS)
        .lean<VehicleWithOwner[]>()
        .exec(),
      VehicleModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },

  findPublicById(id: string): Promise<VehicleWithOwner | null> {
    return VehicleModel.findOne({ _id: id, isDeleted: false })
      .populate<{ owner: OwnerRef }>('owner', OWNER_FIELDS)
      .lean<VehicleWithOwner>()
      .exec();
  },

  findByIds(ids: Types.ObjectId[]): Promise<VehicleWithOwner[]> {
    return VehicleModel.find({ _id: { $in: ids }, isDeleted: false })
      .populate<{ owner: OwnerRef }>('owner', OWNER_FIELDS)
      .lean<VehicleWithOwner[]>()
      .exec();
  },

  /** Hydrated document for owner edits (so search fields are re-derived on save). */
  findLiveDocument(id: string): Promise<VehicleDocument | null> {
    return VehicleModel.findOne({ _id: id, isDeleted: false }).exec();
  },

  findLiveById(id: string | Types.ObjectId): Promise<Vehicle | null> {
    return VehicleModel.findOne({ _id: id, isDeleted: false }).lean<Vehicle>().exec();
  },

  create(data: Partial<Vehicle>): Promise<VehicleDocument> {
    return VehicleModel.create(data);
  },

  /**
   * Takes a write on the vehicle document inside the booking transaction.
   * Concurrent transactions touching the same vehicle conflict here, which
   * serialises booking creation per vehicle without a global lock.
   */
  lockForBooking(id: string, session: ClientSession): Promise<Vehicle | null> {
    return VehicleModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $inc: { bookingVersion: 1 } },
      { new: true, session },
    )
      .lean<Vehicle>()
      .exec();
  },

  async updateRating(
    id: Types.ObjectId,
    averageRating: number,
    reviewCount: number,
    session?: ClientSession,
  ): Promise<void> {
    await VehicleModel.updateOne(
      { _id: id },
      { $set: { averageRating, reviewCount } },
      { session },
    ).exec();
  },

  async softDelete(id: Types.ObjectId, session?: ClientSession): Promise<void> {
    await VehicleModel.updateOne(
      { _id: id },
      { $set: { isDeleted: true, deletedAt: new Date(), isAvailable: false } },
      { session },
    ).exec();
  },

  async ownerStats(ownerId: Types.ObjectId): Promise<{
    totalVehicles: number;
    availableVehicles: number;
    ratingSum: number;
    reviewCount: number;
  }> {
    const [stats] = await VehicleModel.aggregate<{
      totalVehicles: number;
      availableVehicles: number;
      ratingSum: number;
      reviewCount: number;
    }>([
      { $match: { owner: ownerId, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          availableVehicles: { $sum: { $cond: ['$isAvailable', 1, 0] } },
          ratingSum: { $sum: { $multiply: ['$averageRating', '$reviewCount'] } },
          reviewCount: { $sum: '$reviewCount' },
        },
      },
    ]).exec();
    return stats ?? { totalVehicles: 0, availableVehicles: 0, ratingSum: 0, reviewCount: 0 };
  },
};
