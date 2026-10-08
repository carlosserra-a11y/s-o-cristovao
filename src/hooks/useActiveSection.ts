import { useCallback, useEffect, useRef, useState } from 'react';

/** Altura da navbar fixa + barra de categorias (px) — a "linha" de leitura. */
const DEFAULT_READING_LINE = 170;
/** Trava máxima após um clique (caso o navegador não emita `scrollend`). */
const CLICK_LOCK_MS = 2000;

/**
 * "Scrollspy": a seção ativa é a ÚLTIMA cujo topo já passou da linha de
 * leitura (logo abaixo das barras fixas).
 *
 * - IntersectionObserver só dispara o recálculo quando alguma seção cruza a
 *   faixa observada — nenhum listener de scroll, nenhum setState por frame.
 * - Após um clique em aba, a seção escolhida fica travada enquanto a rolagem
 *   suave acontece (evita a aba "piscar" para a seção anterior) e é
 *   reconfirmada no `scrollend` — evento único ao fim da rolagem.
 */
export function useActiveSection(
  sectionIds: readonly string[],
  readingLine = DEFAULT_READING_LINE
): [string | null, (id: string) => void] {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null);
  const lockUntilRef = useRef(0);

  useEffect(() => {
    if (sectionIds.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const recompute = () => {
      if (performance.now() < lockUntilRef.current) return;
      let current = sectionIds[0];
      for (const id of sectionIds) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= readingLine + 1) current = id;
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };

    const observer = new IntersectionObserver(recompute, {
      rootMargin: `-${readingLine}px 0px -40% 0px`,
      threshold: [0, 1],
    });
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    const onScrollEnd = () => {
      lockUntilRef.current = 0;
      recompute();
    };
    window.addEventListener('scrollend', onScrollEnd);

    return () => {
      observer.disconnect();
      window.removeEventListener('scrollend', onScrollEnd);
    };
  }, [sectionIds, readingLine]);

  // Lista mudou (busca) e a ativa sumiu → volta para a primeira disponível.
  useEffect(() => {
    if (activeId && !sectionIds.includes(activeId)) setActiveId(sectionIds[0] ?? null);
  }, [sectionIds, activeId]);

  const select = useCallback((id: string) => {
    lockUntilRef.current = performance.now() + CLICK_LOCK_MS;
    setActiveId(id);
  }, []);

  return [activeId, select];
}
