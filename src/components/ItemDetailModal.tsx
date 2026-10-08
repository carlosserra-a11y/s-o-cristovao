import React, { useState } from 'react';
import { Plus, Minus, Check, Sparkles, MessageSquare } from 'lucide-react';
import { MenuItem, CustomizationOption } from '../types/burger';
import { Dialog, DialogCloseButton } from './ui/Dialog';
import { SafeImage } from './ui/SafeImage';
import { formatBRL } from '../lib/format';
import {
  COMBO_DRINKS,
  EXTRAS,
  ExtraKey,
  MAX_ITEM_QUANTITY,
  MAX_OBSERVATION_LENGTH,
  REMOVALS,
  RemovalKey,
  getUnitPrice,
  isBurgerItem,
  isComboItem,
  roundMoney,
} from '../lib/pricing';

interface ItemDetailModalProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number, customization: CustomizationOption, finalPrice: number) => void;
  onAskAI: (item: MenuItem) => void;
}

type Toggles = Record<ExtraKey | RemovalKey, boolean>;

const INITIAL_TOGGLES: Toggles = {
  baconExtra: false,
  cheddarExtra: false,
  costelaExtra: false,
  maioneseExtra: false,
  semCebola: false,
  semSalada: false,
  semPicles: false,
};

/**
 * Detalhes e personalização do item. Montado pelo App apenas quando há um
 * item selecionado (com `key` = id), então o estado sempre começa limpo e os
 * hooks nunca rodam condicionalmente.
 */
const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose, onAddToCart, onAskAI }) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [toggles, setToggles] = useState<Toggles>(INITIAL_TOGGLES);
  const [observacao, setObservacao] = useState<string>('');
  const [bebidaEscolhida, setBebidaEscolhida] = useState<string>(COMBO_DRINKS[0]);

  const isCombo = isComboItem(item);
  const isBurger = isBurgerItem(item);

  const customization: CustomizationOption = {
    ...toggles,
    observacao: observacao.trim() || undefined,
    bebidaEscolhida: isCombo ? bebidaEscolhida : undefined,
  };
  const totalPrice = roundMoney(getUnitPrice(item, customization) * quantity);

  const toggle = (key: keyof Toggles) => setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleConfirm = () => {
    onAddToCart(item, quantity, customization, totalPrice);
    onClose();
  };

  const titleId = 'item-detail-title';
  const descriptionId = 'item-detail-description';

  return (
    <Dialog
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      panelClassName="w-full max-w-2xl my-auto bg-[#121216] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]"
    >
      <DialogCloseButton
        onClose={onClose}
        label="Fechar detalhes do item"
        className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 transition-colors cursor-pointer"
      />

      {/* Imagem de cabeçalho */}
      <div className="relative h-44 sm:h-64 w-full shrink-0 bg-black">
        <SafeImage
          src={item.image}
          alt=""
          loading="eager"
          responsiveWidths={[640, 800]}
          sizes="(min-width: 672px) 672px, 100vw"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121216] via-transparent to-black/40" />
        <div className="absolute bottom-4 left-6 right-6">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">{item.category}</span>
          <h2 id={titleId} className="text-2xl sm:text-3xl font-black text-white font-display leading-tight">
            {item.name}
          </h2>
        </div>
      </div>

      {/* Corpo rolável */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-6">
        <p id={descriptionId} className="text-sm text-zinc-300 leading-relaxed">
          {item.description}
        </p>

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <span>Dúvidas sobre acompanhamentos ou harmonização deste prato?</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onAskAI(item);
            }}
            className="px-3 py-2 rounded-lg bg-amber-400 text-black text-xs font-bold whitespace-nowrap hover:bg-amber-300 transition-colors cursor-pointer"
          >
            Perguntar ao Sommelier IA
          </button>
        </div>

        {isCombo && (
          <fieldset className="space-y-3 pt-2">
            <legend className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3">
              <span>Escolha sua Bebida Gelada</span>
              <span className="text-xs font-normal text-zinc-400 normal-case">(Incluso no combo)</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {COMBO_DRINKS.map((beb) => {
                const selected = bebidaEscolhida === beb;
                return (
                  <button
                    key={beb}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setBebidaEscolhida(beb)}
                    className={`min-h-11 p-3 rounded-xl text-left border text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between ${
                      selected
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    <span>{beb}</span>
                    {selected && <Check className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {isBurger && (
          <fieldset className="space-y-3 pt-2">
            <legend className="text-sm font-bold text-white uppercase tracking-wider mb-3">
              Adicionais Turbinados (Opcional)
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {EXTRAS.map((extra) => (
                <label
                  key={extra.key}
                  className="flex items-center justify-between gap-3 min-h-11 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer has-[:focus-visible]:border-amber-400"
                >
                  <span className="text-xs text-zinc-200">{extra.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-amber-400 font-bold">+ {formatBRL(extra.price)}</span>
                    <input
                      type="checkbox"
                      checked={toggles[extra.key]}
                      onChange={() => toggle(extra.key)}
                      className="accent-amber-400 w-4 h-4 cursor-pointer"
                    />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {isBurger && (
          <fieldset className="space-y-3 pt-2">
            <legend className="text-sm font-bold text-white uppercase tracking-wider mb-3">
              Prefere Sem Algum Ingrediente?
            </legend>
            <div className="flex flex-wrap gap-2">
              {REMOVALS.map(({ key, ingredient }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={toggles[key]}
                  onClick={() => toggle(key)}
                  className={`min-h-10 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    toggles[key]
                      ? 'bg-red-500/20 border-red-500 text-red-300'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                  }`}
                >
                  {toggles[key] ? `✕ Sem ${ingredient}` : `+ Tirar ${ingredient}`}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="space-y-2 pt-2">
          <label htmlFor="item-observacao" className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            Observações para a Cozinha
          </label>
          <input
            id="item-observacao"
            type="text"
            value={observacao}
            maxLength={MAX_OBSERVATION_LENGTH}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: carne bem passada, enviar sachê extra, etc."
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base sm:text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Rodapé: quantidade e total */}
      <div className="shrink-0 p-4 sm:p-6 bg-black/60 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div
          className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-1.5"
          role="group"
          aria-label="Quantidade"
        >
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Diminuir quantidade"
            className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white cursor-pointer"
          >
            <Minus className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="w-8 text-center font-bold text-base text-white font-mono" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(MAX_ITEM_QUANTITY, q + 1))}
            disabled={quantity >= MAX_ITEM_QUANTITY}
            aria-label="Aumentar quantidade"
            className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm uppercase tracking-wider flex items-center justify-between sm:justify-center gap-4 transition-colors shadow-[0_0_20px_rgba(251,191,36,0.3)] cursor-pointer"
        >
          <span>Adicionar ao Pedido</span>
          <span className="font-mono text-base font-black">{formatBRL(totalPrice)}</span>
        </button>
      </div>
    </Dialog>
  );
};

export default ItemDetailModal;
