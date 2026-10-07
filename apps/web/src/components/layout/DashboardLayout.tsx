import { NavLink, Outlet } from 'react-router';
import { paths } from '@/constants/routes';
import { cn } from '@/utils/cn';

const NAV = {
  CUSTOMER: [
    { to: paths.customer.dashboard, label: 'Overview' },
    { to: paths.customer.bookings, label: 'Bookings' },
    { to: paths.customer.wishlist, label: 'Saved' },
    { to: paths.customer.profile, label: 'Profile' },
  ],
  OWNER: [
    { to: paths.owner.dashboard, label: 'Overview' },
    { to: paths.owner.vehicles, label: 'Vehicles' },
    { to: paths.owner.bookings, label: 'Bookings' },
  ],
} as const;

/** Section navigation answers "where am I, where can I go" inside an account. */
export function DashboardLayout({ role }: { role: keyof typeof NAV }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6">
      <nav
        aria-label="Account sections"
        className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
      >
        <ul className="flex gap-1">
          {NAV[role].map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to.endsWith('dashboard')}
                className={({ isActive }) =>
                  cn(
                    'relative -mb-px inline-flex border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'border-ink text-ink'
                      : 'border-transparent text-muted hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
