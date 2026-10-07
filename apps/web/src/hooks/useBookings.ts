import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateBookingInput } from '@vrp/validation';
import { queryKeys } from '@/constants/queryKeys';
import { bookingService } from '@/services/booking.service';
import type { OwnerBookingAction } from '@/services/booking.service';
import type { BookingDetailDto, BookingScope, BookingStatus } from '@/types';

export function useMyBookings(scope: BookingScope | undefined, page: number, limit = 10) {
  return useQuery({
    queryKey: queryKeys.bookings.mine(scope, page),
    queryFn: () => bookingService.listMine({ ...(scope ? { scope } : {}), page, limit }),
    placeholderData: keepPreviousData,
  });
}

export function useBookingSummary() {
  return useQuery({ queryKey: queryKeys.bookings.summary, queryFn: bookingService.mySummary });
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id ?? ''),
    queryFn: () => bookingService.get(id!),
    enabled: Boolean(id),
  });
}

export function useOwnerBookings(status: BookingStatus | undefined, page: number) {
  return useQuery({
    queryKey: queryKeys.bookings.owner(status, page),
    queryFn: () => bookingService.listForOwner({ ...(status ? { status } : {}), page, limit: 10 }),
    placeholderData: keepPreviousData,
  });
}

export function useOwnerDashboard() {
  return useQuery({
    queryKey: queryKeys.bookings.ownerDashboard,
    queryFn: bookingService.ownerDashboard,
  });
}

/** After any booking change, refresh bookings and anything showing availability. */
function useBookingRefresh() {
  const queryClient = useQueryClient();
  return (booking: BookingDetailDto) => {
    queryClient.setQueryData(queryKeys.bookings.detail(booking.id), booking);
    void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    void queryClient.invalidateQueries({ queryKey: ['vehicles', 'calendar', booking.vehicle.id] });
    void queryClient.invalidateQueries({ queryKey: ['vehicles', 'list'] });
  };
}

export function useCreateBooking() {
  const refresh = useBookingRefresh();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => bookingService.create(input),
    onSuccess: refresh,
  });
}

export function useCancelBooking() {
  const refresh = useBookingRefresh();
  return useMutation({ mutationFn: (id: string) => bookingService.cancel(id), onSuccess: refresh });
}

export function useOwnerBookingAction() {
  const refresh = useBookingRefresh();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: OwnerBookingAction }) =>
      bookingService.ownerAction(id, action),
    onSuccess: refresh,
  });
}
