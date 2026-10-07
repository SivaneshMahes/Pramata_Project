import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/api/client';

/**
 * Maps server-side validation details back onto form fields, so a rule the
 * client didn't know about still shows next to the right input. Returns true
 * when at least one field error was applied.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): boolean {
  if (!(error instanceof ApiError) || error.details.length === 0) return false;
  let applied = false;
  for (const detail of error.details) {
    const root = detail.path.split('.')[0] ?? '';
    if (fields.includes(root)) {
      setError(detail.path as Path<T>, { type: 'server', message: detail.message });
      applied = true;
    }
  }
  return applied;
}
