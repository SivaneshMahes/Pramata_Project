import type { UserRole } from '@/types';

export const paths = {
  home: '/',
  browse: '/vehicles',
  vehicle: (id: string) => `/vehicles/${id}`,
  login: '/login',
  register: '/register',
  onboarding: '/onboarding',
  customer: {
    dashboard: '/customer/dashboard',
    bookings: '/customer/bookings',
    booking: (id: string) => `/customer/bookings/${id}`,
    profile: '/customer/profile',
    wishlist: '/customer/wishlist',
  },
  owner: {
    dashboard: '/owner/dashboard',
    vehicles: '/owner/vehicles',
    newVehicle: '/owner/vehicles/new',
    editVehicle: (id: string) => `/owner/vehicles/${id}/edit`,
    bookings: '/owner/bookings',
  },
} as const;

export const dashboardPathFor = (role: UserRole | null): string =>
  role === null
    ? paths.onboarding
    : role === 'OWNER'
      ? paths.owner.dashboard
      : paths.customer.dashboard;
