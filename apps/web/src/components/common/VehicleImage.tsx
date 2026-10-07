import { useState } from 'react';
import { Bike, Bus, Car, CarFront } from 'lucide-react';
import type { VehicleType } from '@/types';
import { cn } from '@/utils/cn';

const FALLBACK_ICONS: Record<VehicleType, typeof Car> = {
  CAR: Car,
  SUV: CarFront,
  BIKE: Bike,
  VAN: Bus,
};

interface VehicleImageProps {
  src: string | null | undefined;
  alt: string;
  type: VehicleType;
  className?: string;
  sizes?: string;
  eager?: boolean;
}

/** Image with a calm, typed placeholder when missing or broken. */
export function VehicleImage({ src, alt, type, className, eager }: VehicleImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const Icon = FALLBACK_ICONS[type];

  if (!src || failed) {
    return (
      <div
        className={cn('flex items-center justify-center bg-fill text-subtle', className)}
        role="img"
        aria-label={alt}
      >
        <Icon className="size-10" strokeWidth={1.25} aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      className={cn(
        'bg-fill object-cover transition-opacity duration-300',
        loaded ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  );
}
