import { CustomizationOption, MenuItem } from '../types/burger';

/**
 * Regras de preço centralizadas. Antes ficavam embutidas no ItemDetailModal;
 * agora o modal, o carrinho e a reidratação do localStorage usam a mesma fonte.
 */

export type ExtraKey = 'baconExtra' | 'cheddarExtra' | 'costelaExtra' | 'maioneseExtra';
export type RemovalKey = 'semCebola' | 'semSalada' | 'semPicles';

export const EXTRAS: ReadonlyArray<{ key: ExtraKey; label: string; price: number }> = [
  { key: 'baconExtra', label: 'Farofa de Bacon Crocante', price: 6 },
  { key: 'cheddarExtra', label: 'Double Cheddar Cremoso', price: 5 },
  { key: 'costelaExtra', label: 'Costela Desfiada Marinada', price: 9 },
  { key: 'maioneseExtra', label: 'Pote Extra Maionese Caseira', price: 4 },
];

export const REMOVALS: ReadonlyArray<{ key: RemovalKey; ingredient: string }> = [
  { key: 'semCebola', ingredient: 'Cebola' },
  { key: 'semSalada', ingredient: 'Salada' },
  { key: 'semPicles', ingredient: 'Picles' },
];

export const COMBO_DRINKS = [
  'Coca-Cola 200ml',
  'Guaraná Antarctica 350ml',
  'Suco Del Valle Pêssego',
] as const;

export const MAX_OBSERVATION_LENGTH = 200;
export const MAX_ITEM_QUANTITY = 99;
export const MIN_ORDER_VALUE = 29.9;
export const FREE_DELIVERY_THRESHOLD = 75;
export const DELIVERY_FEE = 6.9;

export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export function getExtrasPrice(customization?: CustomizationOption): number {
  if (!customization) return 0;
  return EXTRAS.reduce((sum, extra) => sum + (customization[extra.key] ? extra.price : 0), 0);
}

export function getUnitPrice(item: MenuItem, customization?: CustomizationOption): number {
  return roundMoney(item.price + getExtrasPrice(customization));
}

/** Combos (com bebida) e burgers (aceitam adicionais) — mesma heurística de antes. */
export const isComboItem = (item: MenuItem): boolean => {
  const name = item.name.toLowerCase();
  return name.includes('combo') || name.includes('coca') || name.includes('coquinha');
};

export const isBurgerItem = (item: MenuItem): boolean => !['Molhos', 'Bebidas'].includes(item.category);

/**
 * true quando o item não tem nenhuma personalização. Só itens "puros" são
 * agrupados pelo "Adicionar" rápido — evita somar unidades a um item que
 * tinha adicionais e recalcular o preço errado.
 */
export function isPlainCustomization(customization?: CustomizationOption): boolean {
  if (!customization) return true;
  return (
    EXTRAS.every((e) => !customization[e.key]) &&
    REMOVALS.every((r) => !customization[r.key]) &&
    !customization.observacao?.trim() &&
    !customization.bebidaEscolhida
  );
}

export function getDeliveryFee(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}
