import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import { SPRING_SNAPPY } from '@/utils/motion';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'justify-end bg-success' : 'justify-start bg-slate-300',
      )}
    >
      <motion.span
        layout
        transition={SPRING_SNAPPY}
        className="block size-5 rounded-full bg-white shadow-sm"
        aria-hidden
      />
    </button>
  );
}
