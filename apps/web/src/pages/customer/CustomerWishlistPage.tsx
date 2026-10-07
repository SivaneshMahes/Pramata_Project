import { useState } from 'react';
import { Heart } from 'lucide-react';
import { ButtonLink } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { VehicleGrid, VehicleGridSkeleton } from '@/components/vehicles/VehicleGrid';
import { WishlistButton } from '@/components/vehicles/WishlistButton';
import { paths } from '@/constants/routes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useWishlist } from '@/hooks/useWishlist';

export default function CustomerWishlistPage() {
  useDocumentTitle('Saved vehicles');
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useWishlist(page);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Saved vehicles" description="Vehicles you’ve saved for later." />
      {isPending ? (
        <VehicleGridSkeleton count={3} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title="Nothing saved yet"
          description="Tap the heart on any vehicle to keep it here."
          action={<ButtonLink to={paths.browse}>Browse vehicles</ButtonLink>}
        />
      ) : (
        <>
          <VehicleGrid
            vehicles={data.items.map((item) => item.vehicle)}
            refreshing={isPlaceholderData}
            renderAction={(vehicle) => <WishlistButton vehicleId={vehicle.id} />}
          />
          <Pagination pagination={data.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
