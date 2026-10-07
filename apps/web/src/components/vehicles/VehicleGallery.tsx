import { useRef, useState } from 'react';
import type { VehicleDto } from '@/types';
import { cn } from '@/utils/cn';
import { VehicleImage } from '../common/VehicleImage';

/**
 * Native scroll-snap carousel: swipes track the finger 1:1 and inherit the
 * platform's own momentum, so it feels physical on touch without custom
 * gesture code. Thumbnails jump to an image on larger screens.
 */
export function VehicleGallery({ vehicle }: { vehicle: VehicleDto }) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const images = vehicle.images;

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: index * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };

  if (images.length === 0) {
    return (
      <VehicleImage
        src={null}
        alt={vehicle.name}
        type={vehicle.type}
        className="aspect-[16/10] w-full rounded-card"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-card bg-fill">
        <div
          ref={trackRef}
          className="flex aspect-[16/10] snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
          onScroll={(event) => {
            const track = event.currentTarget;
            setActive(Math.round(track.scrollLeft / track.clientWidth));
          }}
          aria-roledescription="carousel"
          aria-label={`${vehicle.name} photos`}
        >
          {images.map((image, index) => (
            <div
              key={image.url}
              className="w-full shrink-0 snap-center"
              role="group"
              aria-roledescription="slide"
              aria-label={`Photo ${index + 1} of ${images.length}`}
            >
              <VehicleImage
                src={image.url}
                alt={`${vehicle.name}, photo ${index + 1}`}
                type={vehicle.type}
                className="size-full"
                eager={index === 0}
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
            aria-hidden
          >
            {images.map((image, index) => (
              <span
                key={image.url}
                className={cn(
                  'h-1.5 rounded-full bg-white transition-all duration-200',
                  index === active ? 'w-4' : 'w-1.5 opacity-60',
                )}
              />
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="hidden gap-2 sm:flex">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === active}
              className={cn(
                'pressable h-16 w-24 overflow-hidden rounded-lg border-2',
                index === active ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <VehicleImage src={image.url} alt="" type={vehicle.type} className="size-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
