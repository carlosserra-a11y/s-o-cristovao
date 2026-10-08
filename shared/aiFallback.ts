import type { ChatMessageInput, ChatRoleMode } from './api.ts';

export interface FallbackImage {
  imageUrl: string;
  description: string;
}

/**
 * Respostas de contingência usadas quando o Gemini está indisponível.
 * Compartilhado: o servidor usa quando o provedor falha, e o navegador usa
 * quando não há backend (ex.: versão estática publicada no GitHub Pages).
 * Antes eram dezenas de `if (lastUserMsg.includes(...))` dentro da rota;
 * agora são regras declarativas, avaliadas em ordem (a primeira que casar vence).
 */

interface FallbackContext {
  /** Última mensagem do usuário, minúscula e sem acentos ("horário" → "horario"). */
  text: string;
  role: ChatRoleMode;
}

interface ChatFallbackRule {
  id: string;
  matches: (ctx: FallbackContext) => boolean;
  reply: string;
}

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const hasAny = (text: string, keywords: readonly string[]) => keywords.some((k) => text.includes(k));

const CHAT_FALLBACK_RULES: readonly ChatFallbackRule[] = [
  {
    id: 'couple',
    matches: ({ text }) => hasAny(text, ['casal', '2 pessoas', 'duas pessoas', 'dois']),
    reply:
      'Para 2 pessoas, recomendo muito o **Combo: 2 Burgers (Big + Classic) + Fritas + 2 Coca-Cola 200ml (R$ 80,40)**! Vem com 1 Big Burger duplo com bacon e cebola caramelizada, 1 Classic macio e porção caprichada de batatas palito crocantes. Outra opção maravilhosa é o **Combo 2x Cristovão Bacon (R$ 86,40)**.',
  },
  {
    id: 'ribs',
    matches: ({ text }) => text.includes('costela'),
    reply:
      'Se você ama costela, o nosso campeão absoluto é o **Burguer Duplo + Costela - Cristovão Angus Perfeito (R$ 56,90)**! São 2 hambúrgueres Angus de 120g combinados com 80g de costela bovina desfiada marinada, cheddar derretido e maionese caseira. No combo com fritas e Coca sai por R$ 65,90!',
  },
  {
    id: 'bacon',
    matches: ({ text }) => text.includes('bacon'),
    reply:
      'O nosso queridinho é o **Burger 120g Bacon & Cheddar Cristovão Bacon (R$ 48,90)**. Pão brioche tostado na manteiga, queijo cheddar derretido no abafador, alface fresca e fatias generosas de bacon estaladiço!',
  },
  {
    id: 'hours-delivery',
    matches: ({ text }) => hasAny(text, ['horario', 'abre', 'fecha', 'aberto', 'entrega', 'delivery']),
    reply:
      'O São Cristóvão Burger abre todos os dias das **18:00 às 23:30**. Entregamos em toda Palhoça - SC (Pagani, Pedra Branca, Centro, Ponte do Imaruim, Passa Vinte, etc.) com pedido mínimo de apenas **R$ 29,90**!',
  },
  {
    id: 'technique',
    matches: ({ text, role }) => role === 'expert' || hasAny(text, ['crosta', 'maillard', 'smash']),
    reply:
      'A técnica do nosso Smash Burger consiste em prensar uma bola de carne Angus 100% fresca diretamente contra a chapa a mais de 200°C. Essa alta temperatura provoca a reação de Maillard instantânea: os aminoácidos e açúcares caramelizam, criando aquela crostinha dourada e crocante na borda enquanto preserva a suculência interna da carne!',
  },
];

const DEFAULT_CHAT_REPLY =
  'Olá! Aqui no São Cristóvão Burger em Palhoça temos os melhores smash burgers artesanais da região! Nossos destaques hoje são o **Cristovão Bacon 120g (R$ 48,90)**, o **Cristovão Turbo Pickles (R$ 51,90)** e os **Combos para 2 pessoas a partir de R$ 80,40**. Qual tipo de lanche você prefere hoje?';

export function buildChatFallback(messages: readonly ChatMessageInput[], role: ChatRoleMode): string {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const ctx: FallbackContext = { text: normalize(lastUser?.content ?? ''), role };
  return CHAT_FALLBACK_RULES.find((rule) => rule.matches(ctx))?.reply ?? DEFAULT_CHAT_REPLY;
}

// Acervo de fotos gastronômicas (mesmo padrão visual) para o estúdio de imagens.
const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1600&q=90',
  'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=1600&q=90',
  'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1600&q=90',
  'https://images.unsplash.com/photo-1594212699903-eca8a3a114f1?auto=format&fit=crop&w=1600&q=90',
  'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?auto=format&fit=crop&w=1600&q=90',
] as const;

export function buildImageFallback(prompt: string, imageSize: string): FallbackImage {
  return {
    imageUrl: FALLBACK_PHOTOS[Math.floor(Math.random() * FALLBACK_PHOTOS.length)],
    description: `Fotografia gastronômica de referência para "${prompt}" (${imageSize}).`,
  };
}
