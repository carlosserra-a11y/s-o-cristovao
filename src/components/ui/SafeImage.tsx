import React, { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src: string;
  alt: string;
  /** Larguras (px) para gerar srcset quando a imagem vem do Unsplash. */
  responsiveWidths?: number[];
}

const UNSPLASH_HOST = 'images.unsplash.com';

function buildSrcSet(src: string, widths?: number[]): string | undefined {
  if (!widths?.length || !src.includes(UNSPLASH_HOST) || !/[?&]w=\d+/.test(src)) return undefined;
  return widths.map((w) => `${src.replace(/([?&])w=\d+/, `$1w=${w}`)} ${w}w`).join(', ');
}

/**
 * <img> com decodificação assíncrona, srcset responsivo (Unsplash) e
 * placeholder elegante caso a imagem falhe ao carregar.
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  loading = 'lazy',
  responsiveWidths,
  sizes,
  ...rest
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${className} flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-amber-400/60`}
      >
        <UtensilsCrossed className="w-8 h-8" aria-hidden="true" />
      </div>
    );
  }

  const srcSet = buildSrcSet(src, responsiveWidths);

  return (
    <img
      {...rest}
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
};
