import { Car, KeyRound } from 'lucide-react';
import type { UserRole } from '@/types';
import { cn } from '@/utils/cn';

const OPTIONS: { value: UserRole; title: string; body: string; icon: typeof Car }[] = [
  {
    value: 'CUSTOMER',
    title: 'I want to rent',
    body: 'Book vehicles from local owners.',
    icon: KeyRound,
  },
  { value: 'OWNER', title: 'I want to list', body: 'Rent out my vehicles.', icon: Car },
];

export function RolePicker({
  value,
  onChange,
  error,
}: {
  value: UserRole | undefined;
  onChange: (role: UserRole) => void;
  error?: string | undefined;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">How will you use Wheelhouse?</legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        {OPTIONS.map(({ value: option, title, body, icon: Icon }) => {
          const selected = value === option;
          return (
            <label
              key={option}
              className={cn(
                'pressable relative flex cursor-pointer flex-col gap-1 rounded-control border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary',
                selected
                  ? 'border-primary bg-primary-soft/60 ring-1 ring-primary'
                  : 'border-line hover:border-slate-300',
              )}
            >
              <input
                type="radio"
                name="role"
                value={option}
                checked={selected}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              <Icon
                className={cn('size-5', selected ? 'text-primary' : 'text-muted')}
                aria-hidden
              />
              <span className="text-sm font-medium">{title}</span>
              <span className="text-xs text-muted">{body}</span>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </fieldset>
  );
}
