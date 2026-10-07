import { useState } from 'react';
import type { InputHTMLAttributes, Ref } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Input';

/** Password field with a reveal toggle (instead of a "confirm password" box). */
export function PasswordInput({
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} {...props} type={visible ? 'text' : 'password'} className="pr-10" />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-fill hover:text-ink"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
