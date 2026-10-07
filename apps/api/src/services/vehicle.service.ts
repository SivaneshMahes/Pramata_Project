import { ErrorCode, VehicleSort } from '@vrp/shared-types';
import type { Paginated, VehicleDto } from '@vrp/shared-types';
import type { VehicleInput, VehicleQuery } from '@vrp/validation';
import { Types } from 'mongoose';
import type { FilterQuery, SortOrder } from 'mongoose';
import { toVehicleDto } from '../mappers/index.js';
import type { Vehicle, VehicleDocument } from '../models/Vehicle.js';
import { bookingRepository } from '../repositories/booking.repository.js';
import { vehicleRepository } from '../repositories/vehicle.repository.js';
import type { AuthUser } from '../types/auth.js';
import { AppError } from '../utils/AppError.js';
import { isDuplicateKeyError } from '../utils/mongoErrors.js';
import { paginate, toSkip } from '../utils/pagination.js';
import type { PageRequest } from '../utils/pagination.js';
import { escapeRegex, toQueryTokens } from '../utils/search.js';
import { runInTransaction } from '../utils/transaction.js';
import { availabilityService } from './availability.service.js';
import { uploadService } from './upload.service.js';

const SORTS: Record<VehicleSort, Record<string, SortOrder>> = {
  [VehicleSort.NEWEST]: { createdAt: -1, _id: -1 },
  [VehicleSort.PRICE_ASC]: { dailyPrice: 1, _id: 1 },
  [VehicleSort.PRICE_DESC]: { dailyPrice: -1, _id: -1 },
  [VehicleSort.RATING]: { averageRating: -1, reviewCount: -1, _id: -1 },
};

const registrationTaken = () =>
  AppError.conflict(
    ErrorCode.REGISTRATION_TAKEN,
    'A vehicle with this registration number is already listed.',
  );

async function loadOwnedDocument(owner: AuthUser, id: string): Promise<VehicleDocument> {
  const vehicle = await vehicleRepository.findLiveDocument(id);
  if (!vehicle) throw AppError.notFound('Vehicle');
  if (!vehicle.owner.equals(owner.id)) {
    throw AppError.forbidden('You can only manage your own vehicles.');
  }
  return vehicle;
}

async function toDto(id: Types.ObjectId): Promise<VehicleDto> {
  const vehicle = await vehicleRepository.findPublicById(id.toString());
  if (!vehicle) throw AppError.notFound('Vehicle');
  return toVehicleDto(vehicle);
}

export const vehicleService = {
  /** Server-side search, filtering, sorting and pagination for discovery. */
  async list(query: VehicleQuery): Promise<Paginated<VehicleDto>> {
    const filter: FilterQuery<Vehicle> = { isDeleted: false };

    if (query.type) filter.type = query.type;
    if (query.owner) filter.owner = new Types.ObjectId(query.owner);
    if (query.location) {
      // Anchored prefix on a lower-cased field can use the index.
      filter.locationKey = { $regex: `^${escapeRegex(query.location.toLowerCase())}` };
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.dailyPrice = {
        ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
      };
    }
    if (query.search) {
      const tokens = toQueryTokens(query.search);
      if (tokens.length > 0) filter.searchTokens = { $all: tokens };
    }
    if (query.startDate && query.endDate) {
      // Same overlap rule as booking creation; only vehicles free for the
      // whole window and currently accepting bookings are returned.
      const booked = await availabilityService.bookedVehicleIds(query.startDate, query.endDate);
      filter.isAvailable = true;
      if (booked.length > 0) filter._id = { $nin: booked };
    }

    const { items, total } = await vehicleRepository.list(
      filter,
      SORTS[query.sort],
      toSkip(query),
      query.limit,
    );
    return paginate(items.map(toVehicleDto), query, total);
  },

  async getById(id: string): Promise<VehicleDto> {
    const vehicle = await vehicleRepository.findPublicById(id);
    if (!vehicle) throw AppError.notFound('Vehicle');
    return toVehicleDto(vehicle);
  },

  async listForOwner(owner: AuthUser, page: PageRequest): Promise<Paginated<VehicleDto>> {
    const filter = { owner: new Types.ObjectId(owner.id), isDeleted: false };
    const { items, total } = await vehicleRepository.list(
      filter,
      { createdAt: -1, _id: -1 },
      toSkip(page),
      page.limit,
    );
    return paginate(items.map(toVehicleDto), page, total);
  },

  async create(owner: AuthUser, input: VehicleInput): Promise<VehicleDto> {
    uploadService.assertOwnedImages(owner.id, input.images);
    try {
      const vehicle = await vehicleRepository.create({
        ...input,
        owner: new Types.ObjectId(owner.id),
      });
      return toDto(vehicle._id);
    } catch (error) {
      if (isDuplicateKeyError(error)) throw registrationTaken();
      throw error;
    }
  },

  /** Full replacement of owner-editable fields (PUT semantics). */
  async update(owner: AuthUser, id: string, input: VehicleInput): Promise<VehicleDto> {
    const vehicle = await loadOwnedDocument(owner, id);
    uploadService.assertOwnedImages(owner.id, input.images);
    vehicle.set(input);
    try {
      await vehicle.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) throw registrationTaken();
      throw error;
    }
    return toDto(vehicle._id);
  },

  async setAvailability(owner: AuthUser, id: string, isAvailable: boolean): Promise<VehicleDto> {
    const vehicle = await loadOwnedDocument(owner, id);
    vehicle.isAvailable = isAvailable;
    await vehicle.save();
    return toDto(vehicle._id);
  },

  /**
   * Deletes a listing that has no pending, approved or in-progress bookings.
   * The vehicle is locked the same way booking creation locks it, so a booking
   * cannot slip in between the check and the delete.
   */
  async remove(owner: AuthUser, id: string): Promise<void> {
    const vehicle = await loadOwnedDocument(owner, id);
    await runInTransaction(async (session) => {
      const locked = await vehicleRepository.lockForBooking(id, session);
      if (!locked) throw AppError.notFound('Vehicle');
      if (await bookingRepository.existsBlockingForVehicle(vehicle._id, session)) {
        throw AppError.conflict(
          ErrorCode.VEHICLE_HAS_ACTIVE_BOOKINGS,
          'This vehicle has pending, upcoming or active bookings. Resolve them before deleting.',
        );
      }
      await vehicleRepository.softDelete(vehicle._id, session);
    });
  },
};
