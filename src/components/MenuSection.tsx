import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Users, Flame, Tag, SlidersHorizontal } from 'lucide-react';
import { MenuItem } from '../types/burger';
import { CATEGORIES, MENU_ITEMS } from '../data/menuData';
import { useDebounce } from '../hooks/useDebounce';
import { MenuCard } from './MenuCard';

interface MenuSectionProps {
  onSelectItem: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
  onAskAIAboutItem: (item: MenuItem) => void;
}

const SEARCH_DEBOUNCE_MS = 250;
const JUST_ADDED_FEEDBACK_MS = 1500;

/** Remove acentos: "guarana" encontra "Guaraná". */
const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// O cardápio é estático: índices de busca e contagens são calculados uma única vez.
const SEARCH_INDEX: ReadonlyMap<string, string> = new Map(
  MENU_ITEMS.map((item) => [item.id, normalize(`${item.name} ${item.description} ${item.category}`)])
);

const CATEGORY_COUNTS: Readonly<Record<string, number>> = CATEGORIES.reduce<Record<string, number>>(
  (acc, category) => {
    acc[category] =
      category === 'Todos' ? MENU_ITEMS.length : MENU_ITEMS.filter((i) => i.category === category).length;
    return acc;
  },
  {}
);

const isComboOrBox = (item: MenuItem) => {
  const name = item.name.toLowerCase();
  return name.includes('combo') || name.includes('box');
};

export const MenuSection: React.FC<MenuSectionProps> = ({ onSelectItem, onQuickAdd, onAskAIAboutItem }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyPromos, setOnlyPromos] = useState<boolean>(false);
  const [onlyCombos, setOnlyCombos] = useState<boolean>(false);
  // `key` muda a cada clique para reiniciar o feedback mesmo no mesmo item.
  const [justAdded, setJustAdded] = useState<{ id: string; key: number } | null>(null);

  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  const filteredItems = useMemo(() => {
    const query = normalize(debouncedSearch.trim());
    return MENU_ITEMS.filter((item) => {
      if (selectedCategory !== 'Todos' && item.category !== selectedCategory) return false;
      if (query && !SEARCH_INDEX.get(item.id)?.includes(query)) return false;
      if (onlyPromos && !item.originalPrice) return false;
      if (onlyCombos && !isComboOrBox(item)) return false;
      return true;
    });
  }, [selectedCategory, debouncedSearch, onlyPromos, onlyCombos]);

  // Reset do feedback "Adicionado!" com cleanup (sem timers órfãos no unmount).
  useEffect(() => {
    if (!justAdded) return;
    const timeoutId = window.setTimeout(() => setJustAdded(null), JUST_ADDED_FEEDBACK_MS);
    return () => window.clearTimeout(timeoutId);
  }, [justAdded]);

  const handleQuickAdd = useCallback(
    (item: MenuItem) => {
      onQuickAdd(item);
      setJustAdded({ id: item.id, key: Date.now() });
    },
    [onQuickAdd]
  );

  const resetFilters = () => {
    setSelectedCategory('Todos');
    setSearchQuery('');
    setOnlyPromos(false);
    setOnlyCombos(false);
  };

  return (
    <section
      id="cardapio"
      aria-labelledby="cardapio-title"
      className="py-24 relative z-20 bg-[#0c0c0e]/60 border-t border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            Cardápio Oficial São Cristóvão
          </div>
          <h2
            id="cardapio-title"
            className="text-4xl sm:text-5xl font-black uppercase text-white tracking-tight font-display"
          >
            Escolha seu{' '}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
              Smash Favorito
            </span>
          </h2>
          <p className="text-zinc-300 max-w-2xl text-sm sm:text-base">
            Hambúrgueres artesanais montados com carnes selecionadas, pão brioche amanteigado e a lendária maionese da
            casa.
          </p>
        </div>

        {/* Busca e filtros rápidos */}
        <div className="max-w-4xl mx-auto mb-8 space-y-4">
          <div className="relative">
            <label htmlFor="menu-search" className="sr-only">
              Buscar no cardápio
            </label>
            <Search
              className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="menu-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Busque por item ou ingrediente (ex: costela, bacon, gouda, coca)..."
              autoComplete="off"
              enterKeyHint="search"
              className="w-full pl-12 pr-20 py-3.5 bg-zinc-900/95 border border-white/10 rounded-2xl text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/80 transition-colors shadow-inner [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={onlyPromos}
                onClick={() => setOnlyPromos((v) => !v)}
                className={`min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border ${
                  onlyPromos
                    ? 'bg-red-500/20 border-red-500 text-red-300'
                    : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Apenas Ofertas</span>
              </button>

              <button
                type="button"
                aria-pressed={onlyCombos}
                onClick={() => setOnlyCombos((v) => !v)}
                className={`min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border ${
                  onlyCombos
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Combos & Boxes</span>
              </button>
            </div>

            <div className="text-xs text-zinc-300 flex items-center gap-1" aria-live="polite" aria-atomic="true">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>{filteredItems.length} opções encontradas</span>
            </div>
          </div>
        </div>

        {/* Categorias */}
        <div className="relative mb-12">
          <div
            role="group"
            aria-label="Filtrar por categoria"
            className="flex items-center gap-2 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin"
          >
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSelectedCategory(category)}
                  className={`min-h-10 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors duration-200 border cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                      : 'bg-zinc-900/85 text-zinc-300 border-white/10 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span>{category}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-zinc-400'
                    }`}
                  >
                    <span className="sr-only">(</span>
                    {CATEGORY_COUNTS[category]}
                    <span className="sr-only"> itens)</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/60 rounded-3xl border border-white/10 max-w-xl mx-auto">
            <p className="text-zinc-300 text-base mb-4">Nenhum item encontrado para sua busca.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-5 py-3 rounded-xl bg-amber-400 text-black font-bold text-xs uppercase cursor-pointer"
            >
              Ver Cardápio Completo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                isJustAdded={justAdded?.id === item.id}
                onSelect={onSelectItem}
                onQuickAdd={handleQuickAdd}
                onAskAI={onAskAIAboutItem}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
