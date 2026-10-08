import React, { memo } from 'react';
// 192×192 WebP (~11 KB) gerado a partir de logo.jpg (1024×1024, ~596 KB):
// cobre o maior uso (64px) até DPR 3 sem baixar meio megabyte em cada visita.
import logoImg from '../assets/logo-192.webp';

interface SaoCristovaoLogoProps {
  className?: string;
  size?: number | string;
  /** Texto alternativo. Vazio quando o logo é decorativo (marca já escrita ao lado). */
  alt?: string;
}

export const SaoCristovaoLogo: React.FC<SaoCristovaoLogoProps> = memo(function SaoCristovaoLogo({
  className = '',
  size = 52,
  alt = 'São Cristóvão Hamburgueria',
}) {
  const dimension = typeof size === 'number' ? `${size}px` : size;
  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] bg-[#152238] transition-transform duration-300 ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      <img
        src={logoImg}
        alt={alt}
        width={192}
        height={192}
        decoding="async"
        className="w-full h-full object-cover scale-[1.03]"
      />
    </div>
  );
});
