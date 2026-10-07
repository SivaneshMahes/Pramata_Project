import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/** A saved vehicle: a reference pair, never a copy of the vehicle document. */
export interface WishlistItem {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  vehicle: Types.ObjectId;
  createdAt: Date;
}

const wishlistItemSchema = new Schema<WishlistItem>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

wishlistItemSchema.index({ customer: 1, vehicle: 1 }, { unique: true });
wishlistItemSchema.index({ customer: 1, createdAt: -1 });

export const WishlistItemModel = model<WishlistItem>('WishlistItem', wishlistItemSchema);
