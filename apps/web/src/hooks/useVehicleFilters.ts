import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { VehicleFilters } from '@/types';

const KEYS = [
  'search',
  'type',
  'location',
  'minPrice',
  'maxPrice',
  'startDate',
  'endDate',
  'sort',
] as const;

/**
 * Browse filters live in the URL: shareable, bookmarkable, and the back
 * button works. Changing any filter returns to page 1.
 */
export function useVehicleFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<VehicleFilters>(() => {
    const page = Number(params.get('page'));
    return {
      search: params.get('search') ?? '',
      type: params.get('type') ?? '',
      location: params.get('location') ?? '',
      minPrice: params.get('minPrice') ?? '',
      maxPrice: params.get('maxPrice') ?? '',
      startDate: params.get('startDate') ?? '',
      endDate: params.get('endDate') ?? '',
      sort: params.get('sort') ?? 'newest',
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  }, [params]);

  const update = useCallback(
    (patch: Partial<VehicleFilters>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (
              value === '' ||
              value === undefined ||
              (key === 'sort' && value === 'newest') ||
              (key === 'page' && value === 1)
            ) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);
  const activeCount = KEYS.filter(
    (key) => key !== 'sort' && key !== 'search' && filters[key] !== '',
  ).length;

  return { filters, update, reset, activeCount };
}
