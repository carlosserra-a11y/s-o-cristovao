import React, { memo } from 'react';
import { MenuItem } from '../types/burger';
import { formatBRL } from '../lib/format';
import { SafeImage } from './ui/SafeImage';

interface MenuCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}

/**
 * Card enxuto: foto, título, descrição curta e preço. Personalização,
 * adicionais e "adicionar ao carrinho" ficam no modal de detalhes.
 *
 * No celular o card é horizontal (foto à esquerda) para encurtar a rolagem;
 * a partir de `sm` vira card vertical em grade.
 *
 * Acessibilidade: o título é um <button> com "stretched link" (::after cobre
 * o card inteiro), então o card todo é clicável e alcançável via Tab/Enter.
 */
export const MenuCard = memo(function MenuCard({ item, onSelect }: MenuCardProps) {
  const descriptionId = `menu-item-desc-${item.id}`;

  return (
    <article className="group relative w-full flex sm:flex-col bg-zinc-900/90 border border-white/10 hover:border-amber-400/50 focus-within:border-amber-400 rounded-2xl sm:rounded-3xl overflow-hidden transition-colors">
      <div className="relative w-28 min-[400px]:w-32 sm:w-full shrink-0 sm:h-48 bg-black">
        <SafeImage
          src={item.image}
          alt=""
          loading="lazy"
          width={800}
          height={480}
          responsiveWidths={[320, 480, 800]}
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 128px"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {item.originalPrice && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white">
            Oferta
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 p-3.5 sm:p-5 flex flex-col gap-1.5 sm:gap-2">
        <h4 className="text-[15px] sm:text-lg font-bold text-white leading-snug group-hover:text-amber-300 transition-colors font-sans">
          <button
            type="button"
            onClick={() => onSelect(item)}
            aria-describedby={descriptionId}
            className="text-left cursor-pointer focus-visible:outline-none after:absolute after:inset-0 after:content-[''] after:rounded-2xl sm:after:rounded-3xl focus-visible:after:ring-2 focus-visible:after:ring-amber-400"
          >
            {item.name}
          </button>
        </h4>
        <p id={descriptionId} className="text-xs sm:text-[13px] text-zinc-300 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
        <p className="mt-auto pt-1 flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg sm:text-xl font-black text-amber-400 font-display whitespace-nowrap">
            {item.originalPrice && <span className="sr-only">Por </span>}
            {formatBRL(item.price)}
          </span>
          {item.originalPrice && (
            <span className="text-xs text-zinc-400 line-through whitespace-nowrap">
              <span className="sr-only">De </span>
              {formatBRL(item.originalPrice)}
            </span>
          )}
        </p>
      </div>
    </article>
  );
});
