import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useVehicleReviews } from '@/hooks/useVehicles';
import { formatDate, initials } from '@/utils/format';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { Pagination } from '../common/Pagination';
import { Skeleton } from '../common/Skeleton';
import { Stars } from '../common/StarRating';

export function ReviewList({ vehicleId }: { vehicleId: string }) {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useVehicleReviews(
    vehicleId,
    page,
  );

  if (isPending) {
    return (
      <div className="flex flex-col gap-5" role="status" aria-label="Loading reviews">
        {[0, 1].map((key) => (
          <div key={key} className="flex gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (isError)
    return <ErrorState error={error} title="Reviews didn’t load" onRetry={() => void refetch()} />;
  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare />}
        title="No reviews yet"
        description="Reviews appear here after completed rentals."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul
        className={`flex flex-col divide-y divide-line transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
      >
        {data.items.map((review) => (
          <li key={review.id} className="flex gap-3 py-4 first:pt-0">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fill text-xs font-semibold text-muted">
              {initials(review.customer.name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="text-sm font-medium">{review.customer.name}</p>
                <Stars value={review.rating} />
                <p className="text-xs text-muted">{formatDate(review.createdAt.slice(0, 10))}</p>
              </div>
              {review.comment && (
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-slate-700">
                  {review.comment}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Pagination pagination={data.pagination} onPageChange={setPage} />
    </div>
  );
}
