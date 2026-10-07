import { Types } from 'mongoose';
import { WishlistItemModel } from '../models/WishlistItem.js';
import type { WishlistItem } from '../models/WishlistItem.js';

const MAX_IDS = 500;

export const wishlistRepository = {
  async add(customerId: string, vehicleId: string): Promise<void> {
    // Idempotent: saving twice is not an error.
    await WishlistItemModel.updateOne(
      { customer: customerId, vehicle: vehicleId },
      { $setOnInsert: { customer: customerId, vehicle: vehicleId } },
      { upsert: true },
    ).exec();
  },

  async remove(customerId: string, vehicleId: string): Promise<void> {
    await WishlistItemModel.deleteOne({ customer: customerId, vehicle: vehicleId }).exec();
  },

  async list(
    customerId: string,
    skip: number,
    limit: number,
  ): Promise<{ items: WishlistItem[]; total: number }> {
    const filter = { customer: new Types.ObjectId(customerId) };
    const [items, total] = await Promise.all([
      WishlistItemModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<WishlistItem[]>()
        .exec(),
      WishlistItemModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },

  async vehicleIds(customerId: string): Promise<string[]> {
    const rows = await WishlistItemModel.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .limit(MAX_IDS)
      .select('vehicle -_id')
      .lean<{ vehicle: Types.ObjectId }[]>()
      .exec();
    return rows.map((row) => row.vehicle.toString());
  },
};
