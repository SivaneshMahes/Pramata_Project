import type { Paginated, WishlistItemDto } from '@vrp/shared-types';
import { toVehicleDto } from '../mappers/index.js';
import { vehicleRepository } from '../repositories/vehicle.repository.js';
import { wishlistRepository } from '../repositories/wishlist.repository.js';
import { AppError } from '../utils/AppError.js';
import { paginate, toSkip } from '../utils/pagination.js';
import type { PageRequest } from '../utils/pagination.js';

export const wishlistService = {
  async add(customerId: string, vehicleId: string): Promise<void> {
    if (!(await vehicleRepository.findLiveById(vehicleId))) throw AppError.notFound('Vehicle');
    await wishlistRepository.add(customerId, vehicleId);
  },

  remove(customerId: string, vehicleId: string): Promise<void> {
    return wishlistRepository.remove(customerId, vehicleId);
  },

  ids(customerId: string): Promise<string[]> {
    return wishlistRepository.vehicleIds(customerId);
  },

  /** One page of saved items, hydrated with a single $in query (no N+1). */
  async list(customerId: string, page: PageRequest): Promise<Paginated<WishlistItemDto>> {
    const { items, total } = await wishlistRepository.list(customerId, toSkip(page), page.limit);
    const vehicles = await vehicleRepository.findByIds(items.map((item) => item.vehicle));
    const byId = new Map(vehicles.map((vehicle) => [vehicle._id.toString(), vehicle]));
    const dtos = items.flatMap((item) => {
      const vehicle = byId.get(item.vehicle.toString());
      // Deleted listings simply drop out of the list.
      return vehicle
        ? [{ vehicle: toVehicleDto(vehicle), addedAt: item.createdAt.toISOString() }]
        : [];
    });
    return paginate(dtos, page, total);
  },
};
