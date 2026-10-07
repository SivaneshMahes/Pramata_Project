import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  CalendarDays,
  Car,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  UserRound,
} from 'lucide-react';
import { dashboardPathFor, paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { UserDto } from '@/types';
import { initials } from '@/utils/format';
import { SPRING_SNAPPY } from '@/utils/motion';

const itemClass =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink hover:bg-fill focus-visible:bg-fill focus-visible:outline-none';

/** Account menu. It grows out of its trigger (top-right origin) and returns there. */
export function UserMenu({ user }: { user: UserDto }) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const isOwner = user.role === 'OWNER';

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const signOut = async () => {
    setOpen(false);
    await logout();
    toast.info('You’re signed out');
    navigate(paths.home);
  };

  const links = isOwner
    ? [
        { to: paths.owner.dashboard, label: 'Overview', icon: LayoutDashboard },
        { to: paths.owner.vehicles, label: 'My vehicles', icon: Car },
        { to: paths.owner.bookings, label: 'Bookings', icon: CalendarDays },
      ]
    : [
        { to: paths.customer.dashboard, label: 'Overview', icon: LayoutDashboard },
        { to: paths.customer.bookings, label: 'My bookings', icon: CalendarDays },
        { to: paths.customer.wishlist, label: 'Saved vehicles', icon: Heart },
        { to: paths.customer.profile, label: 'Profile', icon: UserRound },
      ];

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-1">
        <Link
          to={dashboardPathFor(user.role)}
          className="pressable hidden rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:text-ink sm:inline-flex"
        >
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="menu"
          className="pressable flex items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-fill"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
            {initials(user.name)}
          </span>
          <span className="hidden max-w-32 truncate text-sm font-medium md:inline">
            {user.name}
          </span>
          <ChevronDown className="size-3.5 text-muted" aria-hidden />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={SPRING_SNAPPY}
            style={{ transformOrigin: 'top right' }}
            className="absolute top-full right-0 mt-2 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-overlay"
          >
            <div className="px-2.5 pt-1.5 pb-2.5">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
              <p className="mt-1 text-xs text-muted">{isOwner ? 'Vehicle owner' : 'Renter'}</p>
            </div>
            <div className="border-t border-line pt-1.5">
              {links.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} role="menuitem" className={itemClass}>
                  <Icon className="size-4 text-muted" aria-hidden />
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-1.5 border-t border-line pt-1.5">
              <button type="button" role="menuitem" onClick={signOut} className={itemClass}>
                <LogOut className="size-4 text-muted" aria-hidden />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
