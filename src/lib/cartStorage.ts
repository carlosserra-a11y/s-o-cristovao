import type { CartItem, CustomizationOption, MenuItem } from '../types/burger';
import { MENU_ITEMS } from '../data/menuData';
import { MAX_ITEM_QUANTITY, getUnitPrice, roundMoney, sanitizeCustomization } from './pricing';

/**
 * Persistência do carrinho no localStorage.
 *
 * Pipeline de leitura: load → parse → validate → sanitize → hydrate.
 *  - Só guardamos o mínimo para reconstruir o carrinho: id da linha, id do
 *    item do cardápio, quantidade e personalização. Nome, imagem e preço são
 *    sempre reidratados a partir do cardápio atual (nunca do storage), então
 *    um preço adulterado no navegador não tem efeito.
 *  - Conteúdo corrompido/inválido é descartado e a chave é limpa.
 *  - Nenhum dado sensível é armazenado (sem endereço, pagamento ou tokens).
 */

export const CART_STORAGE_KEY = 'sao-cristovao-cart:v1';
const STORAGE_VERSION = 1;
const MAX_CART_LINES = 50;
const LINE_ID_PATTERN = /^[\w-]{1,80}$/;

interface StoredCartLine {
  id: string;
  itemId: string;
  quantity: number;
  customization?: CustomizationOption;
}

interface StoredCart {
  version: typeof STORAGE_VERSION;
  items: StoredCartLine[];
}

const MENU_BY_ID: ReadonlyMap<string, MenuItem> = new Map(MENU_ITEMS.map((item) => [item.id, item]));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    // Acesso ao storage pode lançar exceção (modo privado, políticas de cookies).
    return null;
  }
}

function hydrateLine(raw: unknown): CartItem | null {
  if (!isRecord(raw)) return null;
  const { id, itemId, quantity } = raw;

  if (typeof id !== 'string' || !LINE_ID_PATTERN.test(id)) return null;
  if (typeof itemId !== 'string') return null;
  if (typeof quantity !== 'number' || !Number.isInteger(quantity)) return null;
  if (quantity < 1 || quantity > MAX_ITEM_QUANTITY) return null;

  const item = MENU_BY_ID.get(itemId);
  if (!item || item.isAvailable === false) return null;

  const customization = sanitizeCustomization(raw.customization);
  return {
    id,
    item,
    quantity,
    customization,
    totalPrice: roundMoney(getUnitPrice(item, customization) * quantity),
  };
}

export function clearStoredCart(): void {
  try {
    getStorage()?.removeItem(CART_STORAGE_KEY);
  } catch {
    /* storage indisponível — nada a fazer */
  }
}

/** Lê e valida o carrinho salvo. Nunca lança exceção; em caso de dúvida, retorna []. */
export function loadCart(): CartItem[] {
  const storage = getStorage();
  if (!storage) return [];

  let raw: string | null;
  try {
    raw = storage.getItem(CART_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearStoredCart();
    return [];
  }

  if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.items)) {
    clearStoredCart();
    return [];
  }

  const seen = new Set<string>();
  const items: CartItem[] = [];
  for (const line of parsed.items.slice(0, MAX_CART_LINES)) {
    const hydrated = hydrateLine(line);
    if (hydrated && !seen.has(hydrated.id)) {
      seen.add(hydrated.id);
      items.push(hydrated);
    }
  }
  return items;
}

export function serializeCart(items: CartItem[]): string {
  const stored: StoredCart = {
    version: STORAGE_VERSION,
    items: items.slice(0, MAX_CART_LINES).map((ci) => ({
      id: ci.id,
      itemId: ci.item.id,
      quantity: ci.quantity,
      ...(ci.customization ? { customization: sanitizeCustomization(ci.customization) } : {}),
    })),
  };
  return JSON.stringify(stored);
}

/**
 * Salva o carrinho. A serialização é determinística e só escreve quando o
 * conteúdo mudou — isso evita loops de eventos `storage` entre abas.
 */
export function saveCart(items: CartItem[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (items.length === 0) {
      storage.removeItem(CART_STORAGE_KEY);
      return;
    }
    const serialized = serializeCart(items);
    if (storage.getItem(CART_STORAGE_KEY) !== serialized) {
      storage.setItem(CART_STORAGE_KEY, serialized);
    }
  } catch {
    // Quota excedida ou storage bloqueado: o carrinho continua funcionando em memória.
  }
}
