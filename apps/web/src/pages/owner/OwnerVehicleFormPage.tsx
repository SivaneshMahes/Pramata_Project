import { Link, useNavigate, useParams } from 'react-router';
import { ChevronLeft, SearchX } from 'lucide-react';
import { ButtonLink } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSkeleton } from '@/components/common/Skeleton';
import { VehicleForm } from '@/components/vehicles/VehicleForm';
import { paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useVehicle, useVehicleMutations } from '@/hooks/useVehicles';

function BackLink() {
  return (
    <Link
      to={paths.owner.vehicles}
      className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted hover:text-ink"
    >
      <ChevronLeft className="size-4" aria-hidden /> My vehicles
    </Link>
  );
}

export function OwnerVehicleNewPage() {
  useDocumentTitle('Add vehicle');
  const { create } = useVehicleMutations();
  const toast = useToast();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-5">
      <BackLink />
      <PageHeader
        title="Add a vehicle"
        description="Renters can request it as soon as it’s saved."
      />
      <VehicleForm
        submitLabel="Publish listing"
        onCancel={() => navigate(paths.owner.vehicles)}
        onSubmit={async (input) => {
          const vehicle = await create.mutateAsync(input);
          toast.success('Vehicle listed', vehicle.name);
          navigate(paths.owner.vehicles);
        }}
      />
    </div>
  );
}

export function OwnerVehicleEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: vehicle, isPending, isError, error, refetch } = useVehicle(id);
  const { update } = useVehicleMutations();
  const toast = useToast();
  const navigate = useNavigate();
  useDocumentTitle(vehicle ? `Edit ${vehicle.name}` : 'Edit vehicle');

  if (isPending) return <LoadingSkeleton rows={3} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  // The API rejects edits by anyone else; this just avoids showing a doomed form.
  if (vehicle.owner.id !== user?.id) {
    return (
      <EmptyState
        icon={<SearchX />}
        title="This isn’t one of your vehicles"
        action={<ButtonLink to={paths.owner.vehicles}>My vehicles</ButtonLink>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <BackLink />
      <PageHeader
        title={`Edit ${vehicle.name}`}
        description="Changes apply to new bookings. Existing bookings keep their price."
      />
      <VehicleForm
        initial={vehicle}
        submitLabel="Save changes"
        onCancel={() => navigate(paths.owner.vehicles)}
        onSubmit={async (input) => {
          await update.mutateAsync({ id: vehicle.id, input });
          toast.success('Changes saved', vehicle.name);
          navigate(paths.owner.vehicles);
        }}
      />
    </div>
  );
}
