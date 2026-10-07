import { BOOKING_STATUS_META } from '@/constants/labels';
import type { BookingStatus } from '@/types';
import { Badge } from '../common/Badge';

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const meta = BOOKING_STATUS_META[status];
  return (
    <Badge tone={meta.tone}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {meta.label}
    </Badge>
  );
}
