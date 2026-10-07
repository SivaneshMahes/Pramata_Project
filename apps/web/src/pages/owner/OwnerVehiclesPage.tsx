import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Car, Pencil, Plus, Trash2 } from 'lucide-react';
import { errorMessage } from '@/api/client';
import { Button, ButtonLink } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { LoadingSkeleton } from '@/components/common/Skeleton';
import { RatingSummary } from '@/components/common/StarRating';
import { Switch } from '@/components/common/Switch';
import { VehicleImage } from '@/components/common/VehicleImage';
import { VEHICLE_TYPE_LABELS } from '@/constants/labels';
import { paths } from '@/constants/routes';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useMyVehicles, useVehicleMutations } from '@/hooks/useVehicles';
import type { VehicleDto } from '@/types';
import { formatCurrency } from '@/utils/format';

export default function OwnerVehiclesPage() {
  useDocumentTitle('My vehicles');
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useMyVehicles(page);
  const { setAvailability, remove } = useVehicleMutations();
  const toast = useToast();
  const [toDelete, setToDelete] = useState<VehicleDto | null>(null);

  const toggle = (vehicle: VehicleDto, isAvailable: boolean) =>
    setAvailability.mutate(
      { id: vehicle.id, isAvailable },
      {
        onSuccess: () =>
          toast.success(isAvailable ? 'Taking bookings again' : 'Bookings paused', vehicle.name),
        onError: (mutationError) =>
          toast.error('Couldn’t update availability', errorMessage(mutationError)),
      },
    );

  const confirmDelete = () => {
    if (!toDelete) return;
    remove.mutate(toDelete.id, {
      onSuccess: () => toast.success('Vehicle deleted', toDelete.name),
      onError: (mutationError) =>
        toast.error('Can’t delete this vehicle', errorMessage(mutationError)),
      onSettled: () => setToDelete(null),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My vehicles"
        description={data ? `${data.pagination.total} listed` : 'Your listings'}
        actions={
          <ButtonLink to={paths.owner.newVehicle} icon={<Plus className="size-4" />}>
            Add vehicle
          </ButtonLink>
        }
      />

      {isPending ? (
        <LoadingSkeleton rows={4} label="Loading vehicles" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<Car />}
          title="No vehicles yet"
          description="List a vehicle to start receiving booking requests."
          action={<ButtonLink to={paths.owner.newVehicle}>Add your first vehicle</ButtonLink>}
        />
      ) : (
        <>
          <ul
            className={`flex flex-col gap-2 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
          >
            {data.items.map((vehicle) => (
              <li
                key={vehicle.id}
                className="flex flex-col gap-4 rounded-card border border-line bg-surface p-3 shadow-raised sm:flex-row sm:items-center sm:p-4"
              >
                <Link
                  to={paths.vehicle(vehicle.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 rounded-lg"
                >
                  <VehicleImage
                    src={vehicle.images[0]?.url}
                    alt=""
                    type={vehicle.type}
                    className="h-16 w-24 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{vehicle.name}</p>
                    <p className="text-sm text-muted">
                      {VEHICLE_TYPE_LABELS[vehicle.type]} · {vehicle.location} ·{' '}
                      <span className="font-mono text-xs">{vehicle.registrationNumber}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3">
                      <span className="tabular text-sm font-medium">
                        {formatCurrency(vehicle.dailyPrice)}/day
                      </span>
                      <RatingSummary rating={vehicle.averageRating} count={vehicle.reviewCount} />
                    </div>
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-3 border-t border-line pt-3 sm:border-0 sm:pt-0">
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <Switch
                      checked={vehicle.isAvailable}
                      onChange={(checked) => toggle(vehicle, checked)}
                      label={`${vehicle.name} accepting bookings`}
                      disabled={
                        setAvailability.isPending && setAvailability.variables?.id === vehicle.id
                      }
                    />
                    <span className="w-20">{vehicle.isAvailable ? 'Available' : 'Paused'}</span>
                  </label>
                  <div className="flex gap-1">
                    <ButtonLink
                      to={paths.owner.editVehicle(vehicle.id)}
                      variant="ghost"
                      size="sm"
                      icon={<Pencil className="size-3.5" />}
                    >
                      Edit
                    </ButtonLink>
                    <Button
                      variant="dangerGhost"
                      size="sm"
                      onClick={() => setToDelete(vehicle)}
                      aria-label={`Delete ${vehicle.name}`}
                      icon={<Trash2 className="size-3.5" />}
                    >
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            pagination={data.pagination}
            onPageChange={(next) => setParams({ page: String(next) })}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        tone="danger"
        title={`Delete ${toDelete?.name ?? 'vehicle'}?`}
        description="The listing is removed from search. Past bookings and reviews stay in your history. Vehicles with pending or upcoming bookings can’t be deleted."
        confirmLabel="Delete vehicle"
      />
    </div>
  );
}
