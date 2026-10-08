import React from 'react';
import { useReducedMotion } from 'motion/react';
import BurgerExplosion from './burger/BurgerExplosion';
import { EmberField } from './EmberField';

/**
 * Camada visual decorativa (carregada via React.lazy no App):
 *  - brasas ambiente (somente sem prefers-reduced-motion);
 *  - burger explodindo conforme o scroll.
 *
 * A `key` força remontagem caso a preferência de movimento mude em tempo de
 * execução, garantindo que todos os MotionValues sejam recriados no modo certo.
 */
const BackgroundExperience: React.FC = () => {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <>
      {!reduceMotion && <EmberField />}
      <BurgerExplosion key={reduceMotion ? 'static' : 'animated'} reduceMotion={reduceMotion} />
    </>
  );
};

export default BackgroundExperience;
