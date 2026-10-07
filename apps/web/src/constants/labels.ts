import type { BookingStatus, VehicleSort, VehicleType } from '@/types';

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  CAR: 'Car',
  SUV: 'SUV',
  BIKE: 'Bike',
  VAN: 'Van',
};

export const SORT_LABELS: Record<VehicleSort, string> = {
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  rating: 'Top rated',
};

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

export const BOOKING_STATUS_META: Record<
  BookingStatus,
  { label: string; tone: Tone; description: string }
> = {
  PENDING: {
    label: 'Awaiting approval',
    tone: 'warning',
    description: 'The owner has not responded yet.',
  },
  APPROVED: {
    label: 'Confirmed',
    tone: 'primary',
    description: 'Ready for pickup on the start date.',
  },
  HANDED_OVER: {
    label: 'In progress',
    tone: 'success',
    description: 'The vehicle is with the renter.',
  },
  RETURNED: { label: 'Completed', tone: 'neutral', description: 'The vehicle has been returned.' },
  REJECTED: { label: 'Declined', tone: 'danger', description: 'The owner declined this request.' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', description: 'This booking was cancelled.' },
};
