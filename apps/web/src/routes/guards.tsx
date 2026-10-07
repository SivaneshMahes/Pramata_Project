import { Navigate, Outlet, useLocation } from 'react-router';
import { Spinner } from '@/components/common/Spinner';
import { dashboardPathFor, paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';

function FullPageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted">
      <Spinner label="Loading" />
    </div>
  );
}

/**
 * UX guard only: it routes people to the right place. The API independently
 * authenticates and authorises every request, so hiding a route is never the
 * security boundary.
 */
export function RequireRole({ role }: { role: UserRole }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${paths.login}?redirect=${redirect}`} replace />;
  }
  if (user.role !== role) return <Navigate to={dashboardPathFor(user.role)} replace />;
  return <Outlet />;
}

/** Signed-in users skip the login/register screens. */
export function GuestOnly() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (user) return <Navigate to={dashboardPathFor(user.role)} replace />;
  return <Outlet />;
}
