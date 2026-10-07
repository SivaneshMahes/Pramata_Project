import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { Spinner } from '../common/Spinner';
import { Navbar } from './Navbar';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function AppLayout() {
  useRealtimeNotifications();
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-ink px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Navbar />
      <main id="main" className="flex-1">
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center text-muted">
              <Spinner label="Loading page" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-line py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 text-xs text-muted sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Wheelhouse Rentals</span>
          <span>Prices in INR. Rental days run from pickup to return date.</span>
        </div>
      </footer>
    </div>
  );
}
