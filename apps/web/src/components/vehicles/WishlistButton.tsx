import { useLocation, useNavigate } from 'react-router';
import { Heart } from 'lucide-react';
import { paths } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useToggleWishlist, useWishlistIds } from '@/hooks/useWishlist';
import { cn } from '@/utils/cn';

/** Save/unsave toggle. Hidden for owners; guests are sent to sign in. */
export function WishlistButton({
  vehicleId,
  variant = 'overlay',
}: {
  vehicleId: string;
  variant?: 'overlay' | 'inline';
}) {
  const { user } = useAuth();
  const { data: saved } = useWishlistIds();
  const toggle = useToggleWishlist();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  if (user && user.role !== 'CUSTOMER') return null;
  const isSaved = saved?.has(vehicleId) ?? false;

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate(
        `${paths.login}?redirect=${encodeURIComponent(location.pathname + location.search)}`,
      );
      return;
    }
    toggle.mutate(
      { vehicleId, save: !isSaved },
      { onError: () => toast.error('Couldn’t update saved vehicles') },
    );
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSaved}
      aria-label={isSaved ? 'Remove from saved' : 'Save vehicle'}
      className={cn(
        'pressable flex items-center justify-center gap-1.5 rounded-full',
        variant === 'overlay'
          ? 'size-9 bg-white/90 shadow-raised hover:bg-white'
          : 'h-9 border border-line bg-surface px-3 text-sm font-medium hover:bg-fill',
      )}
    >
      <Heart
        className={cn('size-4 transition-colors', isSaved ? 'fill-danger text-danger' : 'text-ink')}
        aria-hidden
      />
      {variant === 'inline' && (isSaved ? 'Saved' : 'Save')}
    </button>
  );
}
