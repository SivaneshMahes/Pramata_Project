import { VEHICLE_TYPES } from '@vrp/shared-types';
import type { VehicleType } from '@vrp/shared-types';
import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';
import { buildSearchTokens } from '../utils/search.js';

export interface VehicleImage {
  url: string;
  key?: string;
}

export interface Vehicle {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  description: string;
  images: VehicleImage[];
  type: VehicleType;
  registrationNumber: string;
  dailyPrice: number;
  location: string;
  /** Lower-cased location for indexed prefix filtering. */
  locationKey: string;
  isAvailable: boolean;
  features: string[];
  averageRating: number;
  reviewCount: number;
  /** Edge n-grams of name/type/location/features for indexed search-as-you-type. */
  searchTokens: string[];
  /**
   * Incremented inside every booking transaction. Two concurrent bookings for
   * the same vehicle both write this document, so MongoDB serialises them with
   * a write conflict and the loser retries against the winner's booking.
   */
  bookingVersion: number;
  /** Soft delete keeps historical bookings and reviews intact. */
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type VehicleDocument = HydratedDocument<Vehicle>;

const vehicleImageSchema = new Schema<VehicleImage>(
  {
    url: { type: String, required: true, maxlength: 2048 },
    key: { type: String, maxlength: 512 },
  },
  { _id: false },
);

const vehicleSchema = new Schema<Vehicle>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    images: { type: [vehicleImageSchema], default: [] },
    type: { type: String, enum: VEHICLE_TYPES, required: true },
    registrationNumber: { type: String, required: true, uppercase: true, trim: true },
    dailyPrice: { type: Number, required: true, min: 1 },
    location: { type: String, required: true, trim: true, maxlength: 80 },
    locationKey: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    features: { type: [String], default: [] },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    searchTokens: { type: [String], default: [], select: false },
    bookingVersion: { type: Number, default: 0, select: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

vehicleSchema.pre('validate', function deriveSearchFields() {
  this.locationKey = this.location.trim().toLowerCase();
  this.searchTokens = buildSearchTokens(this.name, this.type, this.location, ...this.features);
});

// A registration number is unique among live vehicles; a deleted listing frees it.
vehicleSchema.index(
  { registrationNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
// Discovery: every public query filters isDeleted=false, then narrows/sorts.
vehicleSchema.index({ isDeleted: 1, createdAt: -1 });
vehicleSchema.index({ isDeleted: 1, dailyPrice: 1 });
vehicleSchema.index({ isDeleted: 1, averageRating: -1, reviewCount: -1 });
vehicleSchema.index({ isDeleted: 1, type: 1, dailyPrice: 1 });
vehicleSchema.index({ isDeleted: 1, locationKey: 1, dailyPrice: 1 });
vehicleSchema.index({ searchTokens: 1 });
// Owner views.
vehicleSchema.index({ owner: 1, isDeleted: 1, createdAt: -1 });

export const VehicleModel = model<Vehicle>('Vehicle', vehicleSchema);
