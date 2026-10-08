/** Formata valores no padrão já usado pela interface: "R$ 48,90". */
export const formatBRL = (value: number): string => `R$ ${value.toFixed(2).replace('.', ',')}`;

export const formatClock = (date: Date = new Date()): string =>
  date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Id único para itens criados no cliente (carrinho, mensagens, imagens). */
export const createId = (prefix: string): string => {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
};
