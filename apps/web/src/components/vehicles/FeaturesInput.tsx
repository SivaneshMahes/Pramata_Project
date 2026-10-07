import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { controlClasses } from '../common/controlClasses';

interface FeaturesInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  max: number;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/** Type a feature and press Enter or comma. Backspace on empty removes the last one. */
export function FeaturesInput({ value, onChange, onBlur, max, ...aria }: FeaturesInputProps) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const feature = draft.trim().replace(/,$/, '').trim();
    if (
      feature &&
      !value.some((item) => item.toLowerCase() === feature.toLowerCase()) &&
      value.length < max
    ) {
      onChange([...value, feature.slice(0, 40)]);
    }
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        controlClasses,
        'flex min-h-10 flex-wrap items-center gap-1.5 py-1.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10',
      )}
    >
      {value.map((feature) => (
        <span
          key={feature}
          className="inline-flex items-center gap-1 rounded-md bg-fill py-0.5 pr-1 pl-2 text-sm"
        >
          {feature}
          <button
            type="button"
            onClick={() => onChange(value.filter((item) => item !== feature))}
            className="rounded p-0.5 text-muted hover:bg-slate-200 hover:text-ink"
            aria-label={`Remove ${feature}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        {...aria}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          commit();
          onBlur?.();
        }}
        disabled={value.length >= max}
        placeholder={
          value.length === 0 ? 'e.g. Automatic, AC, GPS' : value.length >= max ? '' : 'Add another'
        }
        className="min-w-28 flex-1 bg-transparent py-1 text-[0.9375rem] outline-none placeholder:text-subtle"
      />
    </div>
  );
}
