export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

/** The index key that caused a duplicate-key error, e.g. "registrationNumber". */
export function duplicateKeyField(error: unknown): string | undefined {
  if (!isDuplicateKeyError(error)) return undefined;
  const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  return keyPattern ? Object.keys(keyPattern)[0] : undefined;
}
