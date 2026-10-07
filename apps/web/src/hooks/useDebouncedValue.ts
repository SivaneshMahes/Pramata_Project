import { useEffect, useState } from 'react';

/**
 * Delays a value — used only between typing and *fetching*. The input itself
 * always updates instantly; only the network request waits.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
