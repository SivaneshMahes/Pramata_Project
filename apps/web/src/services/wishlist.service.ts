import type { WishlistItemDto } from '@vrp/shared-types';
import { http, unwrap } from '@/api/client';
import type { Paginated } from '@/types';

export const wishlistService = {
  list: (page: number, limit = 12) =>
    unwrap<Paginated<WishlistItemDto>>(http.get('/users/me/wishlist', { params: { page, limit } })),
  ids: () => unwrap<{ vehicleIds: string[] }>(http.get('/users/me/wishlist/ids')),
  add: (vehicleId: string) =>
    unwrap<{ saved: boolean }>(http.put(`/users/me/wishlist/${vehicleId}`)),
  remove: (vehicleId: string) =>
    unwrap<{ saved: boolean }>(http.delete(`/users/me/wishlist/${vehicleId}`)),
};
