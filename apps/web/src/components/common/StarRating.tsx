import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatRating, pluralize } from '@/utils/format';

/** Compact "★ 4.8 · 24 reviews". New listings say so instead of showing 0.0. */
export function RatingSummary({
  rating,
  count,
  className,
}: {
  rating: number;
  count: number;
  className?: string;
}) {
  if (count === 0) return <span className={cn('text-sm text-muted', className)}>New listing</span>;
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm', className)}>
      <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
      <span className="tabular font-medium">{formatRating(rating)}</span>
      <span className="text-muted">· {pluralize(count, 'review')}</span>
    </span>
  );
}

export function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={cn(
            size === 'sm' ? 'size-3.5' : 'size-5',
            star <= value ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200',
          )}
        />
      ))}
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  name: string;
  invalid?: boolean;
}

/** Accessible rating input: a radio group that previews the hovered value. */
export function StarRatingInput({ value, onChange, name, invalid }: StarInputProps) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;
  const labels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

  return (
    <div className="flex items-center gap-3">
      <div
        role="radiogroup"
        aria-label="Rating"
        aria-invalid={invalid || undefined}
        className="flex"
        onPointerLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            className="pressable cursor-pointer p-1"
            onPointerEnter={() => setHovered(star)}
          >
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="peer sr-only"
              aria-label={`${star} star${star > 1 ? 's' : ''} — ${labels[star - 1]}`}
            />
            <Star
              aria-hidden
              className={cn(
                'size-7 rounded-sm transition-colors duration-100 peer-focus-visible:outline-2 peer-focus-visible:outline-primary',
                star <= shown ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300',
              )}
            />
          </label>
        ))}
      </div>
      <span className="min-w-20 text-sm text-muted" aria-hidden>
        {shown ? labels[shown - 1] : ''}
      </span>
    </div>
  );
}
