import { useEffect, useState } from 'react';

/**
 * Retorna `value` somente depois que ele parar de mudar por `delayMs`.
 * O timeout pendente é cancelado a cada nova mudança e no unmount.
 */
export function useDebounce<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debounced;
}
