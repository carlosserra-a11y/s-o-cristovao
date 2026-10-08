import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Flame } from 'lucide-react';
import { MenuItem } from '../types/burger';
import { CATEGORIES, MENU_ITEMS } from '../data/menuData';
import { useDebounce } from '../hooks/useDebounce';
import { useActiveSection } from '../hooks/useActiveSection';
import { MenuCard } from './MenuCard';

interface MenuSectionProps {
  onSelectItem: (item: MenuItem) => void;
}

const SEARCH_DEBOUNCE_MS = 250;

/** Remove acentos: "guarana" encontra "Guaraná". */
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const slugify = (text: string) => `cat-${normalize(text).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

// O cardápio é estático: índice de busca e agrupamento calculados uma vez.
const SEARCH_INDEX: ReadonlyMap<string, string> = new Map(
  MENU_ITEMS.map((item) => [item.id, normalize(`${item.name} ${item.description} ${item.subcategory ?? ''}`)])
);

interface CategoryGroup {
  name: string;
  id: string;
  items: MenuItem[];
}

const ALL_GROUPS: readonly CategoryGroup[] = CATEGORIES.map((name) => ({
  name,
  id: slugify(name),
  items: MENU_ITEMS.filter((item) => item.category === name),
})).filter((group) => group.items.length > 0); // categorias sem itens (ex.: Sobremesas) ficam ocultas

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const MenuSection: React.FC<MenuSectionProps> = ({ onSelectItem }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);
  const tabsRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const query = normalize(debouncedSearch.trim());
    if (!query) return ALL_GROUPS;
    return ALL_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => SEARCH_INDEX.get(item.id)?.includes(query)),
    })).filter((group) => group.items.length > 0);
  }, [debouncedSearch]);

  const resultCount = useMemo(() => groups.reduce((sum, g) => sum + g.items.length, 0), [groups]);
  const sectionIds = useMemo(() => groups.map((g) => g.id), [groups]);
  const [activeId, setActiveId] = useActiveSection(sectionIds);

  // Mantém a aba ativa visível na barra horizontal (sem mexer no scroll vertical).
  useEffect(() => {
    const container = tabsRef.current;
    const tab = activeId ? container?.querySelector<HTMLElement>(`[data-tab="${activeId}"]`) : null;
    if (!container || !tab) return;
    const left = tab.offsetLeft - container.clientWidth / 2 + tab.clientWidth / 2;
    container.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [activeId]);

  const handleTabClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      setActiveId(id);
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      // Move o foco para a seção (leitores de tela e teclado continuam dali).
      target.focus({ preventScroll: true });
      history.replaceState(null, '', `#${id}`);
    },
    [setActiveId]
  );

  return (
    <section
      id="cardapio"
      aria-labelledby="cardapio-title"
      className="pt-24 pb-24 relative z-20 bg-[#0c0c0e]/80 border-t border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
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
            Toque em um item para ver detalhes, escolher adicionais e montar seu pedido.
          </p>
        </div>

        {/* Busca */}
        <div className="max-w-2xl mx-auto mb-4 relative" role="search">
          <label htmlFor="menu-search" className="sr-only">
            Buscar no cardápio por nome ou ingrediente
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
            placeholder="Buscar por nome ou ingrediente (ex.: costela, bacon, coca)"
            autoComplete="off"
            enterKeyHint="search"
            aria-describedby="menu-search-status"
            className="w-full pl-12 pr-20 py-3.5 bg-zinc-900 border border-white/15 rounded-2xl text-base sm:text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-amber-400 transition-colors [&::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 text-xs text-zinc-300 hover:text-white cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
        <p id="menu-search-status" className="text-center text-xs text-zinc-400 mb-6" aria-live="polite" aria-atomic="true">
          {debouncedSearch.trim()
            ? `${resultCount} ${resultCount === 1 ? 'item encontrado' : 'itens encontrados'} para "${debouncedSearch.trim()}"`
            : `${resultCount} itens em ${groups.length} categorias`}
        </p>
      </div>

      {/* Abas de categoria: fixas logo abaixo da navbar durante a rolagem */}
      {groups.length > 0 && (
        <nav
          aria-label="Categorias do cardápio"
          className="sticky top-20 z-30 mb-8 bg-[#0c0c0e]/95 backdrop-blur-md border-y border-white/10"
        >
          <div
            ref={tabsRef}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {groups.map((group) => {
              const isActive = group.id === activeId;
              return (
                <a
                  key={group.id}
                  href={`#${group.id}`}
                  data-tab={group.id}
                  onClick={(e) => handleTabClick(e, group.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`shrink-0 min-h-10 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'bg-amber-400 text-black border-amber-400'
                      : 'bg-zinc-900 text-zinc-200 border-white/15 hover:border-amber-400/60 hover:text-white'
                  }`}
                >
                  {group.name}
                  <span
                    className={`text-[11px] px-1.5 rounded-full ${isActive ? 'bg-black/15 text-black' : 'bg-white/10 text-zinc-300'}`}
                  >
                    <span className="sr-only">(</span>
                    {group.items.length}
                    <span className="sr-only"> itens)</span>
                  </span>
                </a>
              );
            })}
          </div>
        </nav>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {groups.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/80 rounded-3xl border border-white/10 max-w-xl mx-auto">
            <p className="text-zinc-200 text-base mb-4">Nenhum item encontrado para sua busca.</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-5 py-3 rounded-xl bg-amber-400 text-black font-bold text-xs uppercase cursor-pointer"
            >
              Ver cardápio completo
            </button>
          </div>
        ) : (
          <div className="space-y-14">
            {groups.map((group) => (
              <section
                key={group.id}
                id={group.id}
                tabIndex={-1}
                aria-labelledby={`${group.id}-title`}
                className="scroll-mt-16 focus:outline-none"
              >
                <h3
                  id={`${group.id}-title`}
                  className="text-lg min-[400px]:text-2xl sm:text-3xl font-black uppercase text-white tracking-tight mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1"
                >
                  {group.name}
                  <span className="text-sm font-semibold text-zinc-400 normal-case tracking-normal font-sans">
                    {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                  </span>
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {group.items.map((item) => (
                    <li key={item.id} className="flex">
                      <MenuCard item={item} onSelect={onSelectItem} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
