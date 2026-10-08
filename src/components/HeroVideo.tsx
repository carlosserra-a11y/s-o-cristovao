import React, { useEffect, useRef, useState } from 'react';

interface HeroVideoProps {
  /** Caminho do MP4 (720p, 16:9, sem áudio), relativo ao site. */
  src: string;
  poster?: string;
  className?: string;
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Vídeo decorativo do Hero em loop contínuo.
 *
 * - `autoplay muted loop playsinline`: requisitos para autoplay em iOS/Android.
 * - `muted` também é aplicado via propriedade (o React não reflete o atributo,
 *   e alguns navegadores só liberam autoplay com a propriedade definida).
 * - Pausa quando sai da tela (economiza CPU/bateria) e respeita
 *   prefers-reduced-motion (fica parado no primeiro quadro/pôster).
 * - Se o arquivo falhar, o componente some e o Hero continua normal.
 */
export const HeroVideo: React.FC<HeroVideoProps> = ({ src, poster, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;

    if (prefersReducedMotion()) {
      video.pause();
      return;
    }

    const play = () => void video.play().catch(() => undefined);
    const observer = new IntersectionObserver(
      ([entry]) => (entry?.isIntersecting ? play() : video.pause()),
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  if (failed) return null;

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      poster={poster || undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
      aria-hidden="true"
      tabIndex={-1}
      onError={() => setFailed(true)}
    />
  );
};
