import { ApiError, GoogleGenAI } from '@google/genai';
import type { ChatMessageInput, ChatModel, ChatRoleMode } from '../../shared/api.ts';
import { env, isGeminiConfigured } from '../config/env.ts';
import { AiProviderError } from '../errors/AppError.ts';
import type { ChatModelSelection, GeneratedImage, ValidatedImageRequest } from '../types/ai.ts';

/**
 * Único ponto de acesso ao Gemini: cliente, seleção de modelo, instruções de
 * sistema, chat e geração de imagem. Erros do SDK são traduzidos para
 * AiProviderError com códigos estáveis (timeout, rate limit, auth...).
 */

const IMAGE_MODEL = 'gemini-3-pro-image-preview';

const RESTAURANT_SYSTEM_INSTRUCTION = `Você é o Cristóvão Bot, o Atendente Virtual e Sommelier Oficial da hamburgueria artesanal "São Cristóvão Burger", localizada em Palhoça - SC.
Sua missão é atender clientes com carisma, agilidade, água na boca e precisão culinária.

INFORMAÇÕES DA LOJA:
- Nome: São Cristóvão Burger
- Especialidade: Smash Burgers artesanais de altíssima qualidade, carnes Angus 100g e 120g na chapa a 200°C com crosta de Maillard irresistível, queijo cheddar derretido no abafador, costela bovina desfiada marinada, queijo gouda empanado crocante, maionese caseira da casa feita diariamente.
- Localização: Palhoça - SC (atende Palhoça e região metropolitana).
- Horário de Funcionamento: Abre todos os dias às 18:00 e vai até as 23:30.
- Pedido Mínimo: R$ 29,90.
- Avaliação: 4.7 estrelas (+1.200 avaliações positivas).

CARDÁPIO OFICIAL E PREÇOS:
1. Destaques & Mais Vendidos:
   - Burger 120g Bacon & Cheddar Cristovão Bacon: Pão, hambúrguer 120g, bacon crocante, cheddar derretido, alface americana, tomate, maionese da casa. R$ 48,90 (De R$ 59,90).
   - Cristovão Turbo Pickles: Pão, hambúrguer, cheddar, bacon, generosa porção de picles americano, ketchup Heinz, mostarda Heinz, maionese caseira. Serve 1. R$ 51,90 (De R$ 59,90).
   - Burger Duplo & Onion Rings (Cristóvão Onions): 2 burgers 120g, cheddar, bacon, onion rings crocantes, pão macio, alface, tomate, maionese da casa. R$ 52,90 (De R$ 59,90).
   - Cristovão Angus Perfeito (Costela): 2x hambúrguer Angus 100g, 80g costela desfiada suculenta, queijo cheddar, alface americana, cebola roxa, maionese da casa. R$ 59,90.
   - Cristovão Cremoso: Pão brioche, 2x burgers Angus 100g, banho de cheddar cremoso, cebola caramelizada. R$ 52,90 (De R$ 56,90).

2. Baratíssimos & Edições Especiais:
   - Burger Classic: Pão brioche, burger 120g blend especial, cheddar, alface americana, maionese caseira. R$ 28,90 (De R$ 29,90).
   - Burger Gouda (Edição Especial): Hambúrguer Angus 120g, cheddar, bacon, pedaço generoso de Queijo Gouda Empanado e maionese da casa. R$ 49,90.
   - Burger Junior 120g (Pão, Carne e Queijo / Kids): Pão brioche macio, burger 100g selecionado, cheddar derretido (sem maionese). R$ 33,90.

3. Combos Individuais & Fome Gigante:
   - Combo Cristovão Bacon + Fritas + Coca 200ml: R$ 52,90.
   - Combo Cristovão Onions + Fritas + Coca 200ml: R$ 58,90.
   - Combo Cristovão Triplo (360g carne) + Fritas + Coca 200ml: R$ 60,90.
   - Combo Big Cristovão (2x120g, cebola caramelizada, bacon) + Fritas + Coca 200ml: R$ 62,40 (De R$ 64,90).
   - Combo Cristovão Calabresa + Fritas + Coca 200ml: R$ 63,40 (De R$ 65,90).
   - Combo Cristóvão Angus Perfeito + Fritas + Coca 200ml: R$ 65,90.

4. Combos para 2 e 3 Pessoas:
   - 2x Un. Burger Classic (Sem Fritas): R$ 68,90 (De R$ 69,90).
   - Combo 2 Burgers (Big + Classic) + Fritas + 2 Coca 200ml: R$ 80,40 (De R$ 84,90).
   - Mega Combo 2 Big Cristovão: R$ 82,90 (De R$ 84,90).
   - Combo 2x Cristovão Bacon + 1 Fritas + 2x Coca 200ml: R$ 86,40.
   - 2x Lanches Hambúrguer + Costela Desfiada + Fritas + 2 Coquinhas: R$ 86,90.
   - Combo Família 3 Lanches (Angus Costela + Bacon + Junior) + 2 Cocas + 1 Suco Del Valle: R$ 102,90.

5. Box Experiência & Doces:
   - Box Experiência Individual: 1 Classic Angus 120g e queijo + 1 Pão com Nutella e Kinder Bueno + 1 Fritas com Cheddar e Farofa de Bacon + 3 Molhos. R$ 109,90.
   - Box Experiência Casal: 1 Classic Angus 120g + 1 Cristovão Bacon + Fritas com Cheddar e Bacon + 3 Molhos. R$ 109,90.
   - Combo Experiência Trio: 3 Burgers (Junior + Cebola Caramelizada + Bacon) + Onion Rings + Fritas Cheddar e Bacon + 4 coxinhas/bolinhas + 1 Pote Max Maionese. R$ 139,90.
   - Combo Box Nutella com Kinder Bueno Trio: 1 Junior + 1 Bacon + 1 Burger Nutella com Kinder Bueno + Onions + Fritas Cheddar e Bacon + 4 salgadinhos + Max Maionese. R$ 139,90.

6. Molhos & Bebidas:
   - Maionese Extra Caseira (Branca): R$ 4,00
   - Ketchup Heinz Original Potinho: R$ 4,00
   - Mostarda Heinz Original Potinho: R$ 4,00
   - Coca-Cola 200ml gelada: R$ 5,90
   - Guaraná Antarctica Lata 350ml: R$ 6,90
   - Suco Del Valle Pêssego 290ml: R$ 7,90
   - Cerveja Budweiser OW 330ml: R$ 12,90
   - Cerveja Heineken Long Neck: R$ 14,90

DIRETRIZES DE RESPOSTA:
- Seja prestativo, bem-humorado, use termos gastronômicos que valorizem o sabor do hambúrguer.
- Quando o cliente perguntar o que comer, faça perguntas sobre sua fome (individual, casal, família, pouca ou muita fome) ou sugira o combo mais vantajoso.
- Se pedirem informações de entrega, informe que entregamos em Palhoça e região.
- Formate suas respostas de forma clara, usando tópicos e valores em reais (R$).`;

const ROLE_PROFILES: Record<ChatRoleMode, ChatModelSelection> = {
  fast: {
    model: 'gemini-3.1-flash-lite',
    systemInstruction: `${RESTAURANT_SYSTEM_INSTRUCTION}\nMODO ATENDENTE RÁPIDO: Seja direto, conciso e responda com agilidade máxima às dúvidas do cardápio e horário.`,
  },
  sommelier: {
    model: 'gemini-3.5-flash',
    systemInstruction: `${RESTAURANT_SYSTEM_INSTRUCTION}\nMODO SOMMELIER GOURMET: Ajude o cliente a descobrir o hambúrguer ideal para o momento, sugerindo bebidas que combinam e combos especiais.`,
  },
  expert: {
    model: 'gemini-3.1-pro-preview',
    systemInstruction: `${RESTAURANT_SYSTEM_INSTRUCTION}\nMODO MESTRE HAMBURGUEIRO & CONSULTOR GASTRONÔMICO: Forneça detalhes aprofundados sobre blends de carne, técnica smash Maillard a 200°C, harmonizações complexas, perfis de sabor e orientações para pedidos de grupos e eventos.`,
  },
};

/** Mesma precedência da versão anterior: papel "fast"/"expert" OU modelo explícito. */
export function selectChatProfile(role: ChatRoleMode, modelPreference?: ChatModel): ChatModelSelection {
  if (role === 'fast' || modelPreference === 'gemini-3.1-flash-lite') return ROLE_PROFILES.fast;
  if (role === 'expert' || modelPreference === 'gemini-3.1-pro-preview') return ROLE_PROFILES.expert;
  return ROLE_PROFILES.sommelier;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!isGeminiConfigured()) {
    throw new AiProviderError('AI_PROVIDER_AUTH', 'O assistente está temporariamente indisponível.', {
      cause: new Error('GEMINI_API_KEY ausente ou com valor de exemplo.'),
    });
  }
  client ??= new GoogleGenAI({
    apiKey: env.geminiApiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
  return client;
}

/** Combina o timeout do servidor com o cancelamento do cliente (aba fechada). */
function buildSignal(timeoutMs: number, clientSignal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return clientSignal ? AbortSignal.any([timeout, clientSignal]) : timeout;
}

/** Traduz erros do SDK/rede em AiProviderError com código e status HTTP adequados. */
export function toProviderError(error: unknown, signal?: AbortSignal): AiProviderError {
  if (error instanceof AiProviderError) return error;

  const name = error instanceof Error ? error.name : '';
  const reason = signal?.reason instanceof Error ? signal.reason.name : '';
  if (name === 'TimeoutError' || reason === 'TimeoutError') {
    return new AiProviderError('AI_PROVIDER_TIMEOUT', 'O assistente demorou demais para responder.', { cause: error });
  }
  if (name === 'AbortError') {
    return new AiProviderError('AI_PROVIDER_UNAVAILABLE', 'Requisição cancelada.', { cause: error, status: 499 });
  }

  if (error instanceof ApiError) {
    const { status } = error;
    if (status === 429) {
      return new AiProviderError('AI_PROVIDER_RATE_LIMITED', 'O assistente está com alta demanda. Tente em instantes.', { cause: error });
    }
    if (status === 401 || status === 403) {
      return new AiProviderError('AI_PROVIDER_AUTH', 'O assistente está temporariamente indisponível.', { cause: error });
    }
    if (status === 404) {
      return new AiProviderError('AI_MODEL_UNAVAILABLE', 'O modelo de IA selecionado não está disponível.', { cause: error });
    }
    if (status === 400) {
      return new AiProviderError('AI_PROVIDER_BAD_REQUEST', 'O assistente não conseguiu processar este pedido.', { cause: error });
    }
    if (status === 504) {
      return new AiProviderError('AI_PROVIDER_TIMEOUT', 'O assistente demorou demais para responder.', { cause: error });
    }
  }

  // 5xx, falhas de rede (fetch failed, ECONNRESET...) e erros desconhecidos do SDK.
  return new AiProviderError('AI_PROVIDER_UNAVAILABLE', 'O assistente está temporariamente indisponível.', { cause: error });
}

export async function generateChatReply(
  messages: readonly ChatMessageInput[],
  profile: ChatModelSelection,
  clientSignal?: AbortSignal
): Promise<string> {
  const signal = buildSignal(env.chatTimeoutMs, clientSignal);
  try {
    const response = await getClient().models.generateContent({
      model: profile.model,
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction: profile.systemInstruction,
        temperature: 0.7,
        abortSignal: signal,
      },
    });
    const reply = response.text?.trim();
    if (!reply) {
      throw new AiProviderError('AI_EMPTY_RESPONSE', 'O assistente não retornou uma resposta.');
    }
    return reply;
  } catch (error) {
    throw toProviderError(error, signal);
  }
}

export async function generateImage(
  request: ValidatedImageRequest,
  clientSignal?: AbortSignal
): Promise<GeneratedImage & { model: string }> {
  const signal = buildSignal(env.imageTimeoutMs, clientSignal);
  const enhancedPrompt = `High-end professional gourmet photography for "São Cristóvão Burger". Style: ${request.style}. Subject: ${request.prompt}. Cinematic lighting, steam rising, glossy melted cheddar, glistening seared smash patty with crisp edges, brioche bun with toasted shine, dark slate tabletop, bokeh background, award-winning culinary editorial shot, ultra crisp detail.`;

  try {
    const response = await getClient().models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: enhancedPrompt }] },
      config: {
        imageConfig: { aspectRatio: request.aspectRatio, imageSize: request.imageSize },
        abortSignal: signal,
      },
    });

    let imageUrl: string | null = null;
    const descriptionParts: string[] = [];
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      } else if (part.text) {
        descriptionParts.push(part.text);
      }
    }

    if (!imageUrl) {
      throw new AiProviderError('AI_EMPTY_RESPONSE', 'O gerador não retornou nenhuma imagem.');
    }
    return { imageUrl, description: descriptionParts.join(' ').trim(), model: IMAGE_MODEL };
  } catch (error) {
    throw toProviderError(error, signal);
  }
}

export const GEMINI_IMAGE_MODEL = IMAGE_MODEL;
