import React, { useEffect, useRef } from 'react';

const EMBER_COLORS = ['#fbbf24', '#f59e0b', '#ef4444', '#dc2626', '#f97316'];
const SPRITE_SIZE = 32;

interface Ember {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  sprite: number;
  phase: number;
}

/** Pré-renderiza um "brilho" por cor — evita shadowBlur (muito caro) a cada frame. */
function createSprite(color: string): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = SPRITE_SIZE;
  const ctx = sprite.getContext('2d');
  if (ctx) {
    const half = SPRITE_SIZE / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, '#fff7e0');
    gradient.addColorStop(0.18, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  }
  return sprite;
}

/**
 * Brasas subindo ao fundo (efeito ambiente da versão original), otimizado:
 *  - sprites pré-renderizados em vez de shadowBlur;
 *  - menos partículas em telas pequenas;
 *  - movimento baseado em delta-time (independente da taxa de quadros);
 *  - pausa quando a aba fica oculta; cleanup completo de rAF e listeners.
 * Só é montado quando o usuário NÃO pediu redução de movimento.
 */
export const EmberField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const sprites = EMBER_COLORS.map(createSprite);
    let width = 0;
    let height = 0;
    let frameId = 0;
    let resizeFrameId = 0;
    let lastTime = performance.now();

    const resize = () => {
      resizeFrameId = 0;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();

    const count = width < 768 ? 22 : 45;
    const embers: Ember[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 7 + 4,
      speedY: -(Math.random() * 60 + 30),
      speedX: (Math.random() - 0.5) * 30,
      opacity: Math.random() * 0.6 + 0.25,
      sprite: Math.floor(Math.random() * sprites.length),
      phase: Math.random() * Math.PI * 2,
    }));

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      ctx.clearRect(0, 0, width, height);

      for (const ember of embers) {
        ember.phase += dt * 2.4;
        ember.y += ember.speedY * dt;
        ember.x += (ember.speedX + Math.sin(ember.phase) * 25) * dt;
        if (ember.y < -20) {
          ember.y = height + 20;
          ember.x = Math.random() * width;
        }
        ctx.globalAlpha = ember.opacity;
        ctx.drawImage(sprites[ember.sprite], ember.x, ember.y, ember.size, ember.size);
      }
      ctx.globalAlpha = 1;
      frameId = window.requestAnimationFrame(render);
    };

    const start = () => {
      if (frameId) return;
      lastTime = performance.now();
      frameId = window.requestAnimationFrame(render);
    };
    const stop = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const onResize = () => {
      if (!resizeFrameId) resizeFrameId = window.requestAnimationFrame(resize);
    };
    const onVisibilityChange = () => (document.hidden ? stop() : start());

    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    start();

    return () => {
      stop();
      if (resizeFrameId) window.cancelAnimationFrame(resizeFrameId);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
