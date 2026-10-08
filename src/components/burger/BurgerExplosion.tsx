import React, { useRef, useState } from 'react';
import {
  motion,
  MotionValue,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { BURGER_LAYERS, BurgerLayerSpec, STAGE_HEIGHT, STAGE_WIDTH } from './burgerLayers';
import { useBurgerLayout } from '../../hooks/useBurgerLayout';
import { usePointerTilt } from '../../hooks/usePointerTilt';

/**
 * "Exploding Burger" — composição decorativa fixa atrás do conteúdo.
 *
 * Mapeamento (determinístico e reversível, sem loop autônomo):
 *   progresso do scroll da página (0 → 1)
 *     → useSpring (suaviza a rodinha/trackpad, sem atraso perceptível)
 *     → easeOut leve (a separação começa a ser notada logo no início)
 *     → cada camada: y = explode × offset × unit, além de leve deriva e rotação.
 *
 *   0%   → montado · 25% → separação pequena · 50% → intermediária
 *   75%  → grande  · 100% → totalmente explodido
 *
 * Desempenho: nenhum setState durante o scroll. Tudo roda em MotionValues que
 * escrevem apenas `transform`/`opacity` (compositor da GPU).
 */

const SCROLL_SPRING = { stiffness: 140, damping: 28, mass: 0.35, restDelta: 0.0005 };
const SCROLL_PX_SPRING = { stiffness: 140, damping: 28, mass: 0.35, restDelta: 0.5 };
const EXPLODE_EASE_POWER = 1.6;

/** Opacidade por breakpoint: [hero, seção "A Experiência", cardápio]. */
const OPACITY_BY_BREAKPOINT: Record<number, { hero: number; mid: number; menu: number }> = {
  0: { hero: 0.4, mid: 0.7, menu: 0.2 },
  1: { hero: 0.5, mid: 0.8, menu: 0.24 },
  2: { hero: 1, mid: 1, menu: 0.3 },
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => t * t * (3 - 2 * t);
const pct = (units: number) => `${(units / STAGE_HEIGHT) * 100}%`;

interface ExplodingLayerProps {
  spec: BurgerLayerSpec;
  explode: MotionValue<number>;
  unit: MotionValue<number>;
  shadowOpacity: MotionValue<number>;
}

const ExplodingLayer: React.FC<ExplodingLayerProps> = ({ spec, explode, unit, shadowOpacity }) => {
  const y = useTransform([explode, unit], ([e, u]: number[]) => e * spec.offset * u);
  const x = useTransform([explode, unit], ([e, u]: number[]) => e * spec.drift * u);
  const rotate = useTransform(explode, (e) => e * spec.rotate);
  const { Art } = spec;

  return (
    <motion.div
      data-layer={spec.id}
      className="absolute left-0 w-full will-change-transform"
      style={{ top: pct(spec.top), height: pct(spec.height), x, y, rotate }}
    >
      {/* Sombra de contato que aparece quando a camada se descola das demais */}
      <motion.div
        className="absolute left-[10%] right-[10%] -bottom-[22%] h-[40%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(0,0,0,0.55),transparent)]"
        style={{ opacity: shadowOpacity }}
      />
      <div className="relative h-full w-full">
        <Art />
      </div>
    </motion.div>
  );
};

export interface BurgerExplosionProps {
  /** Quando true, o burger fica estático (montado), sem transformações de movimento. */
  reduceMotion?: boolean;
  /** id da seção do cardápio — usada para esmaecer o burger atrás dos cards. */
  menuSectionId?: string;
}

const BurgerExplosion: React.FC<BurgerExplosionProps> = ({
  reduceMotion = false,
  menuSectionId = 'cardapio',
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  // A seção já está no DOM quando esta camada (lazy) monta.
  const [menuElement] = useState<HTMLElement | null>(() =>
    typeof document === 'undefined' ? null : document.getElementById(menuSectionId)
  );
  const menuRef = useRef<HTMLElement | null>(menuElement);

  const { unit, heroShift, breakpoint } = useBurgerLayout(stageRef);
  const { rotateX, rotateY } = usePointerTilt(!reduceMotion);

  const { scrollY, scrollYProgress } = useScroll();
  const { scrollYProgress: menuScroll } = useScroll(
    menuElement ? { target: menuRef, offset: ['start end', 'start 0.25'] } : undefined
  );
  const zero = useMotionValue(0);
  const menuEnter = menuElement ? menuScroll : zero;

  const smoothProgress = useSpring(scrollYProgress, SCROLL_SPRING);
  const smoothY = useSpring(scrollY, SCROLL_PX_SPRING);

  const explode = useTransform(smoothProgress, (p) =>
    reduceMotion ? 0 : 1 - Math.pow(1 - clamp01(p), EXPLODE_EASE_POWER)
  );
  // 0 no topo do hero → 1 após ~75% da primeira tela: burger migra para o centro.
  const centerT = useTransform(smoothY, (y) => clamp01(y / (window.innerHeight * 0.75)));

  const stageX = useTransform([centerT, heroShift], ([t, shift]: number[]) =>
    reduceMotion ? shift : shift * (1 - easeInOut(t))
  );
  const stageOpacity = useTransform(
    [centerT, menuEnter, breakpoint],
    ([t, m, bp]: number[]) => {
      const o = OPACITY_BY_BREAKPOINT[bp] ?? OPACITY_BY_BREAKPOINT[2];
      return lerp(lerp(o.hero, o.mid, t), o.menu, clamp01(m));
    }
  );
  const stageScale = useTransform(explode, (e) => 1 + e * 0.04);
  const glowScale = useTransform(explode, (e) => 1 + e * 0.35);
  const glowOpacity = useTransform([stageOpacity, explode], ([o, e]: number[]) => o * (0.55 + 0.45 * e));
  const shadowOpacity = useTransform(explode, (e) => clamp01(e * 3) * 0.6);
  const groundShadowScale = useTransform(explode, (e) => 1 - e * 0.25);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center overflow-hidden pt-20 select-none"
      style={{ perspective: 1200 }}
    >
      {/* Brilho quente volumétrico — gradiente radial (sem blur caro) */}
      <motion.div
        className="absolute h-[560px] w-[560px] rounded-full sm:h-[720px] sm:w-[720px] lg:h-[880px] lg:w-[880px]"
        style={{
          x: stageX,
          scale: glowScale,
          opacity: glowOpacity,
          background:
            'radial-gradient(closest-side, rgba(245,158,11,0.24), rgba(239,68,68,0.12) 55%, transparent)',
        }}
      />

      <motion.div
        ref={stageRef}
        className="relative w-[min(78vw,300px)] md:w-[360px] lg:w-[400px] xl:w-[440px]"
        style={{
          aspectRatio: `${STAGE_WIDTH} / ${STAGE_HEIGHT}`,
          x: stageX,
          scale: stageScale,
          opacity: stageOpacity,
          rotateX,
          rotateY,
        }}
      >
        {/* Sombra no "chão" sob o pão inferior */}
        <motion.div
          className="absolute -bottom-[6%] left-[8%] h-[12%] w-[84%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(0,0,0,0.75),transparent)]"
          style={{ scaleX: groundShadowScale }}
        />
        {BURGER_LAYERS.map((spec) => (
          <ExplodingLayer
            key={spec.id}
            spec={spec}
            explode={explode}
            unit={unit}
            shadowOpacity={shadowOpacity}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default BurgerExplosion;
