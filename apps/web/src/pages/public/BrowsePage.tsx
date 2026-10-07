import { useEffect, useState } from 'react';
import { CarFront, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { VehicleFilters } from '@/components/vehicles/VehicleFilters';
import { VehicleGrid, VehicleGridSkeleton } from '@/components/vehicles/VehicleGrid';
import { WishlistButton } from '@/components/vehicles/WishlistButton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useVehicleFilters } from '@/hooks/useVehicleFilters';
import { useVehicles } from '@/hooks/useVehicles';
import { pluralize } from '@/utils/format';

const PAGE_SIZE = 12;

export default function BrowsePage() {
  useDocumentTitle('Browse vehicles');
  const { filters, update, reset, activeCount } = useVehicleFilters();
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Typing updates the field instantly; only the request waits a beat.
  const debouncedSearch = useDebouncedValue(searchDraft);
  useEffect(() => {
    if (debouncedSearch !== filters.search) update({ search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react only to the debounced text
  }, [debouncedSearch]);

  // Free-text fields (location, prices) also debounce before hitting the API.
  const queryFilters = useDebouncedValue(filters, 200);
  const datesIncomplete =
    Boolean(queryFilters.startDate) !== Boolean(queryFilters.endDate) ||
    (queryFilters.startDate && queryFilters.endDate <= queryFilters.startDate);
  const request = {
    ...queryFilters,
    ...(datesIncomplete ? { startDate: '', endDate: '' } : {}),
    limit: PAGE_SIZE,
  };
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useVehicles(request);

  const filterPanel = (
    <VehicleFilters
      filters={filters}
      onChange={update}
      onReset={() => {
        reset();
        setSearchDraft('');
      }}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-[1.75rem]">Browse vehicles</h1>
          <p className="mt-1 text-sm text-muted" aria-live="polite">
            {data ? `${pluralize(data.pagination.total, 'vehicle')} found` : ' '}
          </p>
        </div>
        <div className="flex gap-2 sm:w-96">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search make, model, city…"
              aria-label="Search vehicles"
              className="pl-9"
            />
          </div>
          <Button
            variant="secondary"
            className="lg:hidden"
            onClick={() => setFiltersOpen(true)}
            icon={<SlidersHorizontal className="size-4" />}
          >
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-20">{filterPanel}</div>
        </aside>

        <section aria-label="Results" className="flex min-w-0 flex-col gap-6">
          {isPending ? (
            <VehicleGridSkeleton />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={<CarFront />}
              title="No vehicles match"
              description="Try different dates, widen the price range, or clear a filter."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    reset();
                    setSearchDraft('');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <VehicleGrid
                vehicles={data.items}
                refreshing={isPlaceholderData}
                renderAction={(vehicle) => <WishlistButton vehicleId={vehicle.id} />}
              />
              <Pagination
                pagination={data.pagination}
                onPageChange={(page) => {
                  update({ page });
                  window.scrollTo({ top: 0 });
                }}
              />
            </>
          )}
        </section>
      </div>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <Button onClick={() => setFiltersOpen(false)}>
            {data ? `Show ${pluralize(data.pagination.total, 'vehicle')}` : 'Show results'}
          </Button>
        }
      >
        {filterPanel}
      </Modal>
    </div>
  );
}
