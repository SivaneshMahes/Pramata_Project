import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { NotificationEventDto } from '@vrp/shared-types';
import { queryKeys } from '@/constants/queryKeys';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const TITLES: Record<NotificationEventDto['type'], string> = {
  'booking.created': 'New booking request',
  'booking.cancelled': 'Booking cancelled',
  'booking.approved': 'Booking confirmed',
  'booking.rejected': 'Request declined',
  'booking.handed_over': 'Rental started',
  'booking.returned': 'Rental completed',
};

/**
 * Live booking updates while signed in. The socket authenticates with the
 * same httpOnly session cookie; on each event we show a toast and refresh the
 * affected queries so every open screen reflects the new state.
 */
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const socket = io({
      path: '/api/v1/socket.io',
      transports: ['websocket'],
      withCredentials: true,
    });

    socket.on('notification', (event: NotificationEventDto) => {
      toast.info(TITLES[event.type], event.message);
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      void queryClient.invalidateQueries({ queryKey: ['vehicles', 'calendar'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, toast, queryClient]);
}
