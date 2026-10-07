import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VehicleInput } from '@vrp/validation';
import { queryKeys } from '@/constants/queryKeys';
import { vehicleService } from '@/services/vehicle.service';
import type { VehicleDto, VehicleFilters } from '@/types';

export function useVehicles(filters: Partial<VehicleFilters> & { limit?: number }) {
  return useQuery({
    queryKey: queryKeys.vehicles.list(filters),
    queryFn: () => vehicleService.list(filters),
    // Keep the current grid visible while the next page/filter loads.
    placeholderData: keepPreviousData,
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.detail(id ?? ''),
    queryFn: () => vehicleService.get(id!),
    enabled: Boolean(id),
  });
}

export function useMyVehicles(page: number) {
  return useQuery({
    queryKey: queryKeys.vehicles.mine(page),
    queryFn: () => vehicleService.listMine(page),
    placeholderData: keepPreviousData,
  });
}

export function useVehicleReviews(id: string, page: number) {
  return useQuery({
    queryKey: queryKeys.vehicles.reviews(id, page),
    queryFn: () => vehicleService.reviews(id, page),
    placeholderData: keepPreviousData,
  });
}

export function useAvailabilityCheck(vehicleId: string) {
  return useMutation({
    mutationFn: (params: { startDate: string; endDate: string; couponCode?: string }) =>
      vehicleService.checkAvailability(vehicleId, params),
  });
}

export function useVehicleMutations() {
  const queryClient = useQueryClient();
  const refresh = (vehicle?: VehicleDto) => {
    if (vehicle) queryClient.setQueryData(queryKeys.vehicles.detail(vehicle.id), vehicle);
    return queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
  };

  return {
    create: useMutation({
      mutationFn: (input: VehicleInput) => vehicleService.create(input),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: VehicleInput }) =>
        vehicleService.update(id, input),
      onSuccess: refresh,
    }),
    setAvailability: useMutation({
      mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
        vehicleService.setAvailability(id, isAvailable),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => vehicleService.remove(id),
      onSuccess: () => {
        void refresh();
        void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerDashboard });
      },
    }),
  };
}
