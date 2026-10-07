import type { VehicleInput } from '@vrp/validation';
import { http, unwrap } from '@/api/client';
import type {
  AvailabilityDto,
  Paginated,
  ReviewDto,
  VehicleCalendarDto,
  VehicleDto,
  VehicleFilters,
} from '@/types';

/** Drops empty values so URLs stay clean and the API sees only real filters. */
function toParams(filters: Partial<VehicleFilters> & { limit?: number }) {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null,
    ),
  );
}

export const vehicleService = {
  list: (filters: Partial<VehicleFilters> & { limit?: number }) =>
    unwrap<Paginated<VehicleDto>>(http.get('/vehicles', { params: toParams(filters) })),
  get: (id: string) => unwrap<VehicleDto>(http.get(`/vehicles/${id}`)),
  listMine: (page: number, limit = 20) =>
    unwrap<Paginated<VehicleDto>>(http.get('/vehicles/my', { params: { page, limit } })),
  create: (input: VehicleInput) => unwrap<VehicleDto>(http.post('/vehicles', input)),
  update: (id: string, input: VehicleInput) =>
    unwrap<VehicleDto>(http.put(`/vehicles/${id}`, input)),
  setAvailability: (id: string, isAvailable: boolean) =>
    unwrap<VehicleDto>(http.patch(`/vehicles/${id}/availability`, { isAvailable })),
  remove: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/vehicles/${id}`)),
  checkAvailability: (
    id: string,
    params: { startDate: string; endDate: string; couponCode?: string },
  ) =>
    unwrap<AvailabilityDto>(http.get(`/vehicles/${id}/availability`, { params: toParams(params) })),
  calendar: (id: string, from: string, to: string) =>
    unwrap<VehicleCalendarDto>(http.get(`/vehicles/${id}/calendar`, { params: { from, to } })),
  reviews: (id: string, page: number, limit = 5) =>
    unwrap<Paginated<ReviewDto>>(http.get(`/vehicles/${id}/reviews`, { params: { page, limit } })),
};
