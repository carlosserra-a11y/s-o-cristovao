import { RefObject, useEffect } from 'react';
import { MotionValue, useMotionValue } from 'motion/react';
import { BURGER_SPREAD_SPAN } from '../components/burger/burgerLayers';

/** 0 = mobile (<768px) · 1 = tablet (768–1279px) · 2 = desktop (≥1280px) */
export type BurgerBreakpoint = 0 | 1 | 2;

/** Fator máximo de separação por breakpoint (mobile separa bem menos). */
const MAX_SPREAD: Record<BurgerBreakpoint, number> = { 0: 0.55, 1: 0.8, 2: 1 };
const MIN_SPREAD = 0.3;
/** Altura da navbar fixa + respiro, descontada da área útil. */
const RESERVED_VERTICAL_SPACE = 120;
/** A partir de lg (1024px) o hero tem duas colunas e o burger fica à direita. */
const HERO_SPLIT_MIN_WIDTH = 1024;
const CONTENT_MAX_WIDTH = 1280;

export interface BurgerLayout {
  /** px por unidade de deslocamento (altura do palco × fator de separação). */
  unit: MotionValue<number>;
  /** Deslocamento horizontal do burger no hero (px). 0 quando não há duas colunas. */
  heroShift: MotionValue<number>;
  /** BurgerBreakpoint publicado como number (combinável com outros MotionValues). */
  breakpoint: MotionValue<number>;
}

const getBreakpoint = (width: number): BurgerBreakpoint =>
  width >= 1280 ? 2 : width >= 768 ? 1 : 0;

/**
 * Calcula as medidas responsivas do burger e as publica como MotionValues.
 *
 * Nada aqui dispara re-render do React: resize/ResizeObserver apenas atualizam
 * MotionValues (throttled por requestAnimationFrame), e o Motion aplica os
 * novos valores direto no `transform` dos elementos.
 *
 * O fator de separação é limitado para que o burger totalmente explodido
 * caiba na altura disponível da viewport.
 */
export function useBurgerLayout(stageRef: RefObject<HTMLElement | null>): BurgerLayout {
  const initialWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const unit = useMotionValue(0);
  const heroShift = useMotionValue(0);
  const breakpoint = useMotionValue<number>(getBreakpoint(initialWidth));

  useEffect(() => {
    let frameId = 0;

    const measure = () => {
      frameId = 0;
      const stage = stageRef.current;
      if (!stage) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const bp = getBreakpoint(vw);
      const stageHeight = stage.offsetHeight;
      if (stageHeight === 0) return;

      const available = Math.max(0, vh - RESERVED_VERTICAL_SPACE);
      const fitSpread = (available / stageHeight - 1) / BURGER_SPREAD_SPAN;
      const spread = Math.min(MAX_SPREAD[bp], Math.max(MIN_SPREAD, fitSpread));

      breakpoint.set(bp);
      unit.set(stageHeight * spread);
      heroShift.set(vw >= HERO_SPLIT_MIN_WIDTH ? Math.min(vw, CONTENT_MAX_WIDTH) * 0.24 : 0);
    };

    const schedule = () => {
      if (!frameId) frameId = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('resize', schedule, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (observer && stageRef.current) observer.observe(stageRef.current);

    return () => {
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [stageRef, unit, heroShift, breakpoint]);

  return { unit, heroShift, breakpoint };
}
