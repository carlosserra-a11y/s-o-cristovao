import React, { memo } from 'react';
import { Check, Plus, Sparkles, Users } from 'lucide-react';
import { MenuItem } from '../types/burger';
import { formatBRL } from '../lib/format';
import { SafeImage } from './ui/SafeImage';

interface MenuCardProps {
  item: MenuItem;
  isJustAdded: boolean;
  onSelect: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
  onAskAI: (item: MenuItem) => void;
}

/**
 * Card do cardápio. Memoizado: com handlers estáveis, só re-renderiza quando
 * o próprio item muda de estado ("Adicionado!") — não a cada tecla da busca.
 *
 * Acessibilidade: o título é um <button> com "stretched link" (::after cobre o
 * card), então o card inteiro continua clicável e também é alcançável por
 * teclado, sem aninhar botões dentro de botões.
 */
export const MenuCard = memo(function MenuCard({
  item,
  isJustAdded,
  onSelect,
  onQuickAdd,
  onAskAI,
}: MenuCardProps) {
  return (
    <article className="group relative bg-gradient-to-b from-zinc-900/80 to-zinc-950/95 border border-white/10 hover:border-amber-400/40 focus-within:border-amber-400/60 rounded-3xl overflow-hidden transition-[border-color,box-shadow] duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.7)] flex flex-col">
      {/* Imagem */}
      <div className="relative h-56 overflow-hidden bg-black/80">
        <SafeImage
          src={item.image}
          alt={item.name}
          width={800}
          height={448}
          responsiveWidths={[480, 800]}
          sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {item.originalPrice && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-md">
              Oferta
            </span>
          )}
          {item.highlight && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black shadow-md">
              Destaque
            </span>
          )}
          {item.tags?.slice(0, 1).map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/70 text-zinc-300 border border-white/10"
            >
              {tag}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onAskAI(item)}
          aria-label={`Perguntar ao Sommelier IA sobre ${item.name}`}
          title="Perguntar ao Sommelier IA sobre este burger"
          className="absolute z-10 top-2 right-2 w-11 h-11 rounded-full bg-black/70 hover:bg-amber-400 hover:text-black text-amber-400 border border-white/15 transition-colors cursor-pointer flex items-center justify-center"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
        </button>

        {item.serves && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 text-[11px] font-medium text-zinc-300 border border-white/10 flex items-center gap-1">
            <Users className="w-3 h-3 text-amber-400" aria-hidden="true" />
            <span>{item.serves}</span>
          </div>
        )}
      </div>

      {/* Corpo */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider">{item.category}</span>
          <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="text-left cursor-pointer focus-visible:outline-none after:absolute after:inset-0 after:content-[''] after:rounded-3xl focus-visible:after:ring-2 focus-visible:after:ring-amber-400"
            >
              {item.name}
            </button>
          </h3>
          <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">{item.description}</p>
        </div>

        <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            {item.originalPrice && (
              <span className="text-xs text-zinc-500 line-through whitespace-nowrap">
                <span className="sr-only">De </span>
                {formatBRL(item.originalPrice)}
              </span>
            )}
            <span className="text-xl min-[400px]:text-2xl font-black text-amber-400 font-display whitespace-nowrap">
              {item.originalPrice && <span className="sr-only">por </span>}
              {formatBRL(item.price)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onQuickAdd(item)}
            aria-label={isJustAdded ? `${item.name} adicionado ao carrinho` : `Adicionar ${item.name} ao carrinho`}
            className={`relative z-10 min-h-11 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors duration-300 flex items-center gap-1.5 cursor-pointer ${
              isJustAdded ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-amber-400 hover:text-black'
            }`}
          >
            {isJustAdded ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Adicionado!</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Adicionar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
});
