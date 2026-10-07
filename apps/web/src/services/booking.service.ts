import type { CreateBookingInput } from '@vrp/validation';
import { http, unwrap } from '@/api/client';
import type {
  BookingDetailDto,
  BookingDto,
  BookingScope,
  BookingStatus,
  CustomerSummaryDto,
  OwnerDashboardDto,
  Paginated,
} from '@/types';

export type OwnerBookingAction = 'approve' | 'reject' | 'hand-over' | 'return';

export const bookingService = {
  create: (input: CreateBookingInput) => unwrap<BookingDetailDto>(http.post('/bookings', input)),
  get: (id: string) => unwrap<BookingDetailDto>(http.get(`/bookings/${id}`)),
  listMine: (params: { scope?: BookingScope; page: number; limit?: number }) =>
    unwrap<Paginated<BookingDto>>(http.get('/bookings/my', { params })),
  mySummary: () => unwrap<CustomerSummaryDto>(http.get('/bookings/my/summary')),
  cancel: (id: string) => unwrap<BookingDetailDto>(http.patch(`/bookings/${id}/cancel`)),

  listForOwner: (params: { status?: BookingStatus; page: number; limit?: number }) =>
    unwrap<Paginated<BookingDto>>(http.get('/owner/bookings', { params })),
  ownerAction: (id: string, action: OwnerBookingAction) =>
    unwrap<BookingDetailDto>(http.patch(`/bookings/${id}/${action}`)),
  ownerDashboard: () => unwrap<OwnerDashboardDto>(http.get('/owner/dashboard')),
};
