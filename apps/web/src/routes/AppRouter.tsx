import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { paths } from '@/constants/routes';
import { GuestOnly, RequireRole } from './guards';

// Route-level code splitting keeps the first load small.
const HomePage = lazy(() => import('@/pages/public/HomePage'));
const BrowsePage = lazy(() => import('@/pages/public/BrowsePage'));
const VehicleDetailsPage = lazy(() => import('@/pages/public/VehicleDetailsPage'));
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const OnboardingPage = lazy(() => import('@/pages/auth/OnboardingPage'));
const CustomerDashboardPage = lazy(() => import('@/pages/customer/CustomerDashboardPage'));
const CustomerBookingsPage = lazy(() => import('@/pages/customer/CustomerBookingsPage'));
const CustomerBookingDetailPage = lazy(() => import('@/pages/customer/CustomerBookingDetailPage'));
const CustomerProfilePage = lazy(() => import('@/pages/customer/CustomerProfilePage'));
const CustomerWishlistPage = lazy(() => import('@/pages/customer/CustomerWishlistPage'));
const OwnerDashboardPage = lazy(() => import('@/pages/owner/OwnerDashboardPage'));
const OwnerVehiclesPage = lazy(() => import('@/pages/owner/OwnerVehiclesPage'));
const OwnerVehicleNewPage = lazy(() =>
  import('@/pages/owner/OwnerVehicleFormPage').then((m) => ({ default: m.OwnerVehicleNewPage })),
);
const OwnerVehicleEditPage = lazy(() =>
  import('@/pages/owner/OwnerVehicleFormPage').then((m) => ({ default: m.OwnerVehicleEditPage })),
);
const OwnerBookingsPage = lazy(() => import('@/pages/owner/OwnerBookingsPage'));

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="vehicles" element={<BrowsePage />} />
        <Route path="vehicles/:id" element={<VehicleDetailsPage />} />

        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
        <Route path="onboarding" element={<OnboardingPage />} />

        <Route path="customer" element={<RequireRole role="CUSTOMER" />}>
          <Route element={<DashboardLayout role="CUSTOMER" />}>
            <Route index element={<Navigate to={paths.customer.dashboard} replace />} />
            <Route path="dashboard" element={<CustomerDashboardPage />} />
            <Route path="bookings" element={<CustomerBookingsPage />} />
            <Route path="bookings/:id" element={<CustomerBookingDetailPage />} />
            <Route path="profile" element={<CustomerProfilePage />} />
            <Route path="wishlist" element={<CustomerWishlistPage />} />
          </Route>
        </Route>

        <Route path="owner" element={<RequireRole role="OWNER" />}>
          <Route element={<DashboardLayout role="OWNER" />}>
            <Route index element={<Navigate to={paths.owner.dashboard} replace />} />
            <Route path="dashboard" element={<OwnerDashboardPage />} />
            <Route path="vehicles" element={<OwnerVehiclesPage />} />
            <Route path="vehicles/new" element={<OwnerVehicleNewPage />} />
            <Route path="vehicles/:id/edit" element={<OwnerVehicleEditPage />} />
            <Route path="bookings" element={<OwnerBookingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
