import { motion } from 'motion/react';
import { useId } from 'react';
import { cn } from '@/utils/cn';
import { SPRING_SNAPPY } from '@/utils/motion';

interface Option<T extends string> {
  value: T;
  label: string;
  count?: number | undefined;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/**
 * Single-choice filter rendered as a group of toggle buttons. The selection indicator glides between segments so the
 * change of context is legible; it starts from wherever it currently is.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        '-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'pressable relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium',
              selected ? 'text-white' : 'text-muted hover:text-ink',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`segment-${groupId}`}
                className="absolute inset-0 rounded-full bg-ink"
                transition={SPRING_SNAPPY}
                aria-hidden
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {option.label}
              {option.count !== undefined && option.count > 0 && (
                <span className={cn('tabular text-xs', selected ? 'text-white/70' : 'text-subtle')}>
                  {option.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
