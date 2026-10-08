import { useEffect } from 'react';
import { MotionValue, useMotionValue, useSpring } from 'motion/react';

const TILT_SPRING = { stiffness: 90, damping: 20, mass: 0.6 };

/**
 * Inclinação sutil (parallax) seguindo o cursor — preserva o efeito
 * "mova o cursor para inclinar o burger" da versão anterior, mas sem
 * setState: o listener só escreve em MotionValues.
 *
 * Ativo apenas em dispositivos com ponteiro fino (mouse) e quando o usuário
 * não pediu redução de movimento.
 */
export function usePointerTilt(
  enabled: boolean,
  maxDegrees = 8
): { rotateX: MotionValue<number>; rotateY: MotionValue<number> } {
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const rotateX = useSpring(targetX, TILT_SPRING);
  const rotateY = useSpring(targetY, TILT_SPRING);

  useEffect(() => {
    if (!enabled || !window.matchMedia('(pointer: fine)').matches) {
      targetX.set(0);
      targetY.set(0);
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = (event.clientY / window.innerHeight) * 2 - 1;
      targetX.set(-ny * maxDegrees);
      targetY.set(nx * maxDegrees * 1.15);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [enabled, maxDegrees, targetX, targetY]);

  return { rotateX, rotateY };
}
