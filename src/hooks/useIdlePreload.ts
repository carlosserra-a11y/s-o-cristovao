import { useEffect } from 'react';

type Loader = () => Promise<unknown>;

/**
 * Pré-carrega chunks (React.lazy) quando o navegador estiver ocioso, depois do
 * primeiro paint. Assim o cardápio carrega rápido e os modais abrem sem atraso.
 */
export function useIdlePreload(loaders: readonly Loader[], fallbackDelayMs = 2500): void {
  useEffect(() => {
    const run = () => loaders.forEach((load) => void load().catch(() => undefined));

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, fallbackDelayMs);
    return () => window.clearTimeout(id);
    // Os loaders são funções de módulo estáveis: executa uma vez.
  }, []);
}
