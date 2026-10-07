import { Link, NavLink } from 'react-router';
import { paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';
import { ButtonLink } from '../common/Button';
import { UserMenu } from './UserMenu';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'pressable rounded-full px-3 py-1.5 text-sm font-medium',
    isActive ? 'bg-fill text-ink' : 'text-muted hover:text-ink',
  );

export function Logo() {
  return (
    <Link
      to={paths.home}
      className="flex items-center gap-2 rounded-md font-semibold tracking-tight"
      aria-label="Wheelhouse home"
    >
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0F172A" />
        <circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="2.5" fill="#2563EB" />
      </svg>
      <span className="text-[1.0625rem]">Wheelhouse</span>
    </Link>
  );
}

/** Translucent bar: content scrolls beneath it rather than behind a solid strip. */
export function Navbar() {
  const { user, isLoading } = useAuth();

  return (
    <header className="material-bar sticky top-0 z-40 border-b border-line/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-6 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1">
          <NavLink
            to={paths.home}
            end
            className={(state) => cn(linkClass(state), 'hidden sm:inline-flex')}
          >
            Home
          </NavLink>
          <NavLink to={paths.browse} className={linkClass}>
            Browse
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {isLoading ? null : user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <ButtonLink to={paths.login} variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink to={paths.register} size="sm">
                Create account
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
