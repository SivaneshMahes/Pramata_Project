import type { BookingScope, BookingStatus, VehicleFilters } from '@/types';

/** Hierarchical keys so a mutation can invalidate exactly what it affects. */
export const queryKeys = {
  me: ['auth', 'me'] as const,
  vehicles: {
    all: ['vehicles'] as const,
    list: (filters: Partial<VehicleFilters> & { limit?: number }) =>
      ['vehicles', 'list', filters] as const,
    detail: (id: string) => ['vehicles', 'detail', id] as const,
    mine: (page: number) => ['vehicles', 'mine', page] as const,
    reviews: (id: string, page: number) => ['vehicles', 'reviews', id, page] as const,
    calendar: (id: string, from: string, to: string) =>
      ['vehicles', 'calendar', id, from, to] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    mine: (scope: BookingScope | undefined, page: number) =>
      ['bookings', 'mine', scope ?? 'all', page] as const,
    summary: ['bookings', 'summary'] as const,
    detail: (id: string) => ['bookings', 'detail', id] as const,
    owner: (status: BookingStatus | undefined, page: number) =>
      ['bookings', 'owner', status ?? 'all', page] as const,
    ownerDashboard: ['bookings', 'owner-dashboard'] as const,
  },
} as const;
