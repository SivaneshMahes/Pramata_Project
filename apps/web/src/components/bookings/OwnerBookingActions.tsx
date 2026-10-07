import { useState } from 'react';
import { canTransition } from '@vrp/shared-types';
import { errorMessage } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import { useOwnerBookingAction } from '@/hooks/useBookings';
import type { OwnerBookingAction } from '@/services/booking.service';
import type { BookingDto } from '@/types';
import { localToday } from '@/utils/dates';
import { formatDate } from '@/utils/format';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';

const SUCCESS: Record<OwnerBookingAction, string> = {
  approve: 'Booking approved',
  reject: 'Request declined',
  'hand-over': 'Marked as handed over',
  return: 'Marked as returned',
};

/**
 * Only the actions the shared state machine allows for this status are shown.
 * The API enforces the same table, so the UI can't drift from the rules.
 */
export function OwnerBookingActions({
  booking,
  size = 'sm',
}: {
  booking: BookingDto;
  size?: 'sm' | 'md';
}) {
  const action = useOwnerBookingAction();
  const toast = useToast();
  const [confirmReject, setConfirmReject] = useState(false);
  const [pending, setPending] = useState<OwnerBookingAction | null>(null);

  const run = (kind: OwnerBookingAction) => {
    setPending(kind);
    action.mutate(
      { id: booking.id, action: kind },
      {
        onSuccess: () => toast.success(SUCCESS[kind], booking.vehicle.name),
        onError: (error) => toast.error('Couldn’t update the booking', errorMessage(error)),
        onSettled: () => {
          setPending(null);
          setConfirmReject(false);
        },
      },
    );
  };

  const busy = action.isPending;
  const startsLater = booking.startDate > localToday();
  const buttons: React.ReactNode[] = [];

  if (canTransition(booking.status, 'APPROVED')) {
    buttons.push(
      <Button
        key="approve"
        size={size}
        onClick={() => run('approve')}
        loading={pending === 'approve'}
        disabled={busy}
      >
        Approve
      </Button>,
      <Button
        key="reject"
        size={size}
        variant="secondary"
        onClick={() => setConfirmReject(true)}
        disabled={busy}
      >
        Decline
      </Button>,
    );
  }
  if (canTransition(booking.status, 'HANDED_OVER')) {
    buttons.push(
      <Button
        key="hand-over"
        size={size}
        onClick={() => run('hand-over')}
        loading={pending === 'hand-over'}
        disabled={busy || startsLater}
        title={startsLater ? `Available from ${formatDate(booking.startDate)}` : undefined}
      >
        Hand over
      </Button>,
    );
  }
  if (canTransition(booking.status, 'RETURNED')) {
    buttons.push(
      <Button
        key="return"
        size={size}
        onClick={() => run('return')}
        loading={pending === 'return'}
        disabled={busy}
      >
        Mark returned
      </Button>,
    );
  }

  if (buttons.length === 0) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2">{buttons}</div>
      {canTransition(booking.status, 'HANDED_OVER') && startsLater && (
        <p className="mt-1.5 text-xs text-muted">
          Hand-over opens on {formatDate(booking.startDate)}.
        </p>
      )}
      <ConfirmDialog
        open={confirmReject}
        onClose={() => setConfirmReject(false)}
        onConfirm={() => run('reject')}
        loading={pending === 'reject'}
        tone="danger"
        title="Decline this request?"
        description={`${booking.customer.name} will be told the vehicle isn’t available. The dates become free for other renters.`}
        confirmLabel="Decline request"
      />
    </>
  );
}
