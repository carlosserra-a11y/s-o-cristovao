import {
  ASPECT_RATIOS,
  CHAT_LIMITS,
  CHAT_MODELS,
  IMAGE_LIMITS,
  IMAGE_SIZES,
  IMAGE_STYLES,
} from '../../shared/api.ts';
import type { AspectRatio, ChatMessageInput, ChatModel, ChatRoleMode, ImageSize, ImageStyle } from '../../shared/api.ts';
import { AppError } from '../errors/AppError.ts';
import type { ValidatedChatRequest, ValidatedImageRequest } from '../types/ai.ts';

/**
 * Validação manual e estrita (sem dependência extra): nunca confiamos no
 * req.body. Retorna objetos novos contendo apenas os campos conhecidos.
 */

const CHAT_ROLES: readonly ChatRoleMode[] = ['fast', 'sommelier', 'expert'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value);

// Remove caracteres de controle (exceto \n e \t) que não têm uso legítimo no chat.
const stripControlChars = (text: string) => text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

function invalid(details: string[]): never {
  throw new AppError('INVALID_PAYLOAD', 'Dados enviados são inválidos.', { details });
}

export function validateChatRequest(body: unknown): ValidatedChatRequest {
  if (!isRecord(body)) invalid(['O corpo da requisição deve ser um objeto JSON.']);

  const errors: string[] = [];
  const { messages, role, modelPreference } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    invalid(['"messages" deve ser uma lista com pelo menos uma mensagem.']);
  }
  if (messages.length > CHAT_LIMITS.maxMessages) {
    errors.push(`"messages" aceita no máximo ${CHAT_LIMITS.maxMessages} mensagens.`);
  }

  const sanitized: ChatMessageInput[] = [];
  messages.slice(0, CHAT_LIMITS.maxMessages).forEach((msg, index) => {
    if (!isRecord(msg)) {
      errors.push(`messages[${index}] deve ser um objeto.`);
      return;
    }
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      errors.push(`messages[${index}].role deve ser "user" ou "assistant".`);
    }
    if (typeof msg.content !== 'string' || msg.content.trim().length === 0) {
      errors.push(`messages[${index}].content deve ser um texto não vazio.`);
      return;
    }
    if (msg.content.length > CHAT_LIMITS.maxMessageLength) {
      errors.push(`messages[${index}].content excede ${CHAT_LIMITS.maxMessageLength} caracteres.`);
      return;
    }
    if (msg.role === 'user' || msg.role === 'assistant') {
      sanitized.push({ role: msg.role, content: stripControlChars(msg.content).trim() });
    }
  });

  if (sanitized.length > 0 && sanitized[sanitized.length - 1].role !== 'user') {
    errors.push('A última mensagem deve ser do usuário.');
  }
  if (role !== undefined && !isOneOf(CHAT_ROLES, role)) {
    errors.push(`"role" deve ser um de: ${CHAT_ROLES.join(', ')}.`);
  }
  if (modelPreference !== undefined && !isOneOf(CHAT_MODELS, modelPreference)) {
    errors.push(`"modelPreference" deve ser um de: ${CHAT_MODELS.join(', ')}.`);
  }

  if (errors.length > 0) invalid(errors);

  return {
    messages: sanitized,
    role: (role as ChatRoleMode | undefined) ?? 'sommelier',
    modelPreference: modelPreference as ChatModel | undefined,
  };
}

export function validateImageRequest(body: unknown): ValidatedImageRequest {
  if (!isRecord(body)) invalid(['O corpo da requisição deve ser um objeto JSON.']);

  const errors: string[] = [];
  const { prompt, imageSize, aspectRatio, style } = body;

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    errors.push('"prompt" é obrigatório.');
  } else if (prompt.length > IMAGE_LIMITS.maxPromptLength) {
    errors.push(`"prompt" excede ${IMAGE_LIMITS.maxPromptLength} caracteres.`);
  }
  if (imageSize !== undefined && !isOneOf(IMAGE_SIZES, imageSize)) {
    errors.push(`"imageSize" deve ser um de: ${IMAGE_SIZES.join(', ')}.`);
  }
  if (aspectRatio !== undefined && !isOneOf(ASPECT_RATIOS, aspectRatio)) {
    errors.push(`"aspectRatio" deve ser um de: ${ASPECT_RATIOS.join(', ')}.`);
  }
  if (style !== undefined && !isOneOf(IMAGE_STYLES, style)) {
    errors.push(`"style" deve ser um de: ${IMAGE_STYLES.join(', ')}.`);
  }

  if (errors.length > 0) invalid(errors);

  return {
    prompt: stripControlChars(prompt as string).trim(),
    imageSize: (imageSize as ImageSize | undefined) ?? '1K',
    aspectRatio: (aspectRatio as AspectRatio | undefined) ?? '1:1',
    style: (style as ImageStyle | undefined) ?? 'Dark Gourmet Gastronômico',
  };
}
