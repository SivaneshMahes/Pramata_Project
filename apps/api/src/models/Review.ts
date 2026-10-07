import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

export interface Review {
  _id: Types.ObjectId;
  vehicle: Types.ObjectId;
  customer: Types.ObjectId;
  booking: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = HydratedDocument<Review>;

const reviewSchema = new Schema<Review>(
  {
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true },
);

// One review per booking — enforced by the database, not just the service.
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ vehicle: 1, createdAt: -1 });
reviewSchema.index({ customer: 1, createdAt: -1 });

export const ReviewModel = model<Review>('Review', reviewSchema);
