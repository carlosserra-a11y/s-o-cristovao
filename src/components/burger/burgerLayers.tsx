/**
 * Arte vetorial de cada camada do smash burger.
 *
 * Por que SVG inline e não imagens?
 *  - O projeto só possui fotos "achatadas" (burger montado / explodido em um
 *    único JPG). A animação exige camadas independentes, então cada ingrediente
 *    é desenhado como um SVG próprio.
 *  - Vetor = nitidez em qualquer DPR, ~zero bytes de rede, nenhum layout shift
 *    (dimensões previsíveis via viewBox) e nenhuma falha de carregamento.
 *
 * Todas as camadas compartilham a mesma largura lógica (400 unidades). O
 * `top`/`height` de cada uma está no sistema de coordenadas do "palco"
 * (STAGE_HEIGHT), e o componente BurgerExplosion converte isso para % do palco.
 */
import React from 'react';

export const STAGE_WIDTH = 400;
export const STAGE_HEIGHT = 335;

// PRNG determinístico (LCG) — formas "orgânicas" idênticas a cada render/build.
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const fmt = (n: number) => Math.round(n * 10) / 10;

/** Borda ondulada (folha de alface): topo e base com frequências diferentes. */
function buildLettucePath(): string {
  const rand = seededRandom(7);
  const top: string[] = [];
  const bottom: string[] = [];
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const x = 4 + (392 * i) / steps;
    const yTop = 14 + Math.sin(i * 1.7) * 5 + (rand() - 0.5) * 4;
    top.push(`${fmt(x)} ${fmt(yTop)}`);
  }
  for (let i = steps; i >= 0; i--) {
    const x = 4 + (392 * i) / steps;
    const yBottom = 32 + Math.sin(i * 2.3 + 1) * 7 + (rand() - 0.5) * 5;
    bottom.push(`${fmt(x)} ${fmt(yBottom)}`);
  }
  return `M${top.join(' L')} L${bottom.join(' L')} Z`;
}

/** Contorno da carne smash com bordas rendadas/crocantes. */
function buildPattyPath(): string {
  const rand = seededRandom(42);
  const pts: string[] = [];
  const cx = 200;
  const cy = 34;
  const rx = 184;
  const ry = 28;
  const steps = 64;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    // "Superelipse" achatada: laterais mais retas, como um disco prensado.
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const sx = Math.sign(cos) * Math.pow(Math.abs(cos), 0.55);
    const sy = Math.sign(sin) * Math.pow(Math.abs(sin), 0.8);
    const jitter = 1 + (rand() - 0.5) * 0.06;
    pts.push(`${fmt(cx + sx * rx * jitter)} ${fmt(cy + sy * ry * jitter)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const LETTUCE_PATH = buildLettucePath();
const PATTY_PATH = buildPattyPath();

const SESAME_SEEDS: ReadonlyArray<readonly [number, number, number]> = [
  [120, 50, -20], [165, 36, 10], [210, 30, -5], [255, 40, 15], [295, 58, -25],
  [140, 78, 5], [190, 64, -15], [238, 70, 20], [280, 86, -10], [100, 90, 25],
  [330, 96, 10], [175, 98, 0], [220, 102, -20], [75, 114, -15], [305, 118, 15],
];

const PATTY_SPECKLES = (() => {
  const rand = seededRandom(99);
  return Array.from({ length: 34 }, () => ({
    x: fmt(30 + rand() * 340),
    y: fmt(14 + rand() * 40),
    r: fmt(1 + rand() * 2.4),
    light: rand() > 0.6,
  }));
})();

const TOMATO_SEEDS = (() => {
  const rand = seededRandom(5);
  return Array.from({ length: 14 }, (_, i) => ({
    x: fmt((i < 7 ? 70 : 220) + rand() * 110),
    y: fmt(14 + rand() * 10),
  }));
})();

const TopBun = () => (
  <svg viewBox="0 0 400 150" width="100%" height="100%" focusable="false">
    <defs>
      <radialGradient id="sc-bun-top" cx="38%" cy="22%" r="85%">
        <stop offset="0" stopColor="#ffd88a" />
        <stop offset="0.32" stopColor="#ec9c42" />
        <stop offset="0.72" stopColor="#b8611d" />
        <stop offset="1" stopColor="#6e330e" />
      </radialGradient>
    </defs>
    <path
      d="M24 128 C 18 60, 110 12, 200 12 C 290 12, 382 60, 376 128 C 374 140, 362 146, 348 146 L 52 146 C 38 146, 26 140, 24 128 Z"
      fill="url(#sc-bun-top)"
    />
    <path
      d="M30 134 C 120 143, 280 143, 370 134 L 368 141 C 360 147, 350 148, 340 148 L 60 148 C 48 148, 38 146, 32 141 Z"
      fill="#e9c38c"
    />
    <ellipse cx="150" cy="46" rx="74" ry="17" fill="#fff" opacity="0.16" transform="rotate(-12 150 46)" />
    {SESAME_SEEDS.map(([x, y, r]) => (
      <g key={`${x}-${y}`} transform={`rotate(${r} ${x} ${y})`}>
        <ellipse cx={x} cy={y + 1.4} rx="5.2" ry="2.6" fill="#7a3d12" opacity="0.35" />
        <ellipse cx={x} cy={y} rx="5" ry="2.5" fill="#fff3d4" />
      </g>
    ))}
  </svg>
);

const Sauce = () => (
  <svg viewBox="0 0 400 34" width="100%" height="100%" focusable="false">
    <defs>
      <linearGradient id="sc-sauce" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff4d2" />
        <stop offset="1" stopColor="#f1c467" />
      </linearGradient>
    </defs>
    <path
      d="M40 6 C 120 0, 280 0, 360 6 C 372 8, 372 16, 362 18 C 350 20, 345 30, 336 30 C 328 30, 326 20, 318 20 L 250 20 C 244 20, 242 32, 234 32 C 226 32, 226 20, 218 20 L 140 20 C 132 20, 130 28, 122 28 C 114 28, 114 20, 106 20 L 40 18 C 28 16, 28 8, 40 6 Z"
      fill="url(#sc-sauce)"
    />
    <ellipse cx="160" cy="8" rx="40" ry="2.2" fill="#fff" opacity="0.55" />
  </svg>
);

const Lettuce = () => (
  <svg viewBox="0 0 400 44" width="100%" height="100%" focusable="false">
    <defs>
      <linearGradient id="sc-lettuce" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b5ec6a" />
        <stop offset="0.55" stopColor="#6fbf3a" />
        <stop offset="1" stopColor="#3d8a24" />
      </linearGradient>
    </defs>
    <path d={LETTUCE_PATH} fill="url(#sc-lettuce)" />
    <path
      d="M30 22 Q 80 16 130 23 T 230 22 T 330 23 T 380 21"
      fill="none"
      stroke="#e6ffc4"
      strokeWidth="1.4"
      opacity="0.55"
    />
  </svg>
);

const Tomato = () => (
  <svg viewBox="0 0 400 40" width="100%" height="100%" focusable="false">
    {[
      { cx: 128, rx: 106 },
      { cx: 276, rx: 102 },
    ].map(({ cx, rx }) => (
      <g key={cx}>
        <ellipse cx={cx} cy="25" rx={rx} ry="13" fill="#9e1b14" />
        <ellipse cx={cx} cy="19" rx={rx} ry="13" fill="#e2372a" />
        <ellipse cx={cx} cy="19" rx={rx - 12} ry="9" fill="#ff6a4f" />
        <ellipse cx={cx - rx * 0.35} cy="15" rx={rx * 0.22} ry="2.2" fill="#fff" opacity="0.35" />
      </g>
    ))}
    {TOMATO_SEEDS.map((s, i) => (
      <ellipse key={i} cx={s.x} cy={s.y} rx="2.6" ry="1.4" fill="#ffd6a8" opacity="0.85" />
    ))}
  </svg>
);

const Cheese = () => (
  <svg viewBox="0 0 400 56" width="100%" height="100%" focusable="false">
    <defs>
      <linearGradient id="sc-cheese" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe066" />
        <stop offset="0.5" stopColor="#fbb024" />
        <stop offset="1" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <path
      d="M28 10 L 372 10 C 380 10, 382 18, 376 22 L 352 34 L 340 52 C 337 56, 331 55, 330 50 L 326 34 L 230 30 L 214 46 C 210 50, 204 49, 204 44 L 200 30 L 110 30 L 84 50 C 80 54, 73 52, 74 46 L 78 30 L 24 22 C 18 18, 20 10, 28 10 Z"
      fill="url(#sc-cheese)"
    />
    <path d="M40 13 L 250 13" stroke="#fff8c2" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
  </svg>
);

const Patty = () => (
  <svg viewBox="0 0 400 70" width="100%" height="100%" focusable="false">
    <defs>
      <linearGradient id="sc-patty" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7a3c1a" />
        <stop offset="0.45" stopColor="#4a2210" />
        <stop offset="1" stopColor="#22100a" />
      </linearGradient>
      <linearGradient id="sc-patty-crust" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#c46a26" stopOpacity="0" />
        <stop offset="0.5" stopColor="#d9822f" stopOpacity="0.45" />
        <stop offset="1" stopColor="#c46a26" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d={PATTY_PATH} fill="url(#sc-patty)" />
    {/* Crosta de Maillard: brilho caramelizado na faixa superior */}
    <ellipse cx="200" cy="16" rx="160" ry="5" fill="url(#sc-patty-crust)" />
    {PATTY_SPECKLES.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.light ? '#a8571f' : '#1a0b05'} opacity="0.7" />
    ))}
  </svg>
);

const BottomBun = () => (
  <svg viewBox="0 0 400 80" width="100%" height="100%" focusable="false">
    <defs>
      <linearGradient id="sc-bun-bottom" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#eea24a" />
        <stop offset="0.55" stopColor="#bf6a22" />
        <stop offset="1" stopColor="#6e330e" />
      </linearGradient>
    </defs>
    <path
      d="M26 14 C 26 8, 32 6, 40 6 L 360 6 C 368 6, 374 8, 374 14 L 372 40 C 368 66, 330 76, 200 76 C 70 76, 32 66, 28 40 Z"
      fill="url(#sc-bun-bottom)"
    />
    <path d="M28 8 C 120 18, 280 18, 372 8 L 372 18 C 280 27, 120 27, 28 18 Z" fill="#f1cf93" />
  </svg>
);

export type BurgerLayerId =
  | 'bottomBun'
  | 'patty'
  | 'cheese'
  | 'tomato'
  | 'lettuce'
  | 'sauce'
  | 'topBun';

export interface BurgerLayerSpec {
  id: BurgerLayerId;
  label: string;
  /** Posição/altura (unidades do palco) quando o burger está montado. */
  top: number;
  height: number;
  /**
   * Deslocamento vertical no estado "explodido", em múltiplos de `unit`
   * (altura do palco × fator de espaçamento responsivo). Negativo = sobe.
   */
  offset: number;
  /** Deriva horizontal (múltiplos de `unit`) e rotação final (graus). */
  drift: number;
  rotate: number;
  Art: React.FC;
}

/**
 * Ordem = ordem de pintura (de baixo para cima). O pão superior é o último
 * para ficar por cima de tudo quando montado.
 */
export const BURGER_LAYERS: readonly BurgerLayerSpec[] = [
  { id: 'bottomBun', label: 'Pão inferior', top: 252, height: 80, offset: 0.36, drift: 0.02, rotate: 3, Art: BottomBun },
  { id: 'patty', label: 'Hambúrguer', top: 196, height: 70, offset: 0.17, drift: -0.03, rotate: -2, Art: Patty },
  { id: 'cheese', label: 'Queijo', top: 178, height: 56, offset: 0.03, drift: 0.04, rotate: 4, Art: Cheese },
  { id: 'tomato', label: 'Tomate', top: 160, height: 40, offset: -0.1, drift: -0.05, rotate: -4, Art: Tomato },
  { id: 'lettuce', label: 'Alface', top: 140, height: 44, offset: -0.22, drift: 0.04, rotate: 3, Art: Lettuce },
  { id: 'sauce', label: 'Molho', top: 132, height: 34, offset: -0.36, drift: -0.02, rotate: -2, Art: Sauce },
  { id: 'topBun', label: 'Pão superior', top: 0, height: 150, offset: -0.55, drift: 0.03, rotate: -6, Art: TopBun },
];

/** Soma das distâncias extremas — usada para garantir que o burger caiba na tela. */
export const BURGER_SPREAD_SPAN =
  Math.max(...BURGER_LAYERS.map((l) => l.offset)) - Math.min(...BURGER_LAYERS.map((l) => l.offset));
