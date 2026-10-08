import type { Request, Response } from 'express';
import type { ApiMeta, ChatResponseData, ImageResponseData } from '../../shared/api.ts';
import { env } from '../config/env.ts';
import { AiProviderError } from '../errors/AppError.ts';
import { buildChatFallback, buildImageFallback } from '../../shared/aiFallback.ts';
import { GEMINI_IMAGE_MODEL, generateChatReply, generateImage, selectChatProfile } from '../services/geminiService.ts';
import { validateChatRequest, validateImageRequest } from '../validators/aiValidator.ts';
import { clientDisconnectSignal, sendSuccess } from '../utils/http.ts';

/**
 * Política de contingência: erros do PROVEDOR de IA (timeout, indisponível,
 * rate limit, chave inválida...) viram resposta de fallback com
 * meta.fallback = true — o cliente continua atendido e a UI sinaliza o modo.
 * O erro real é sempre logado. Erros de validação e bugs internos NÃO são
 * mascarados: seguem para o errorHandler com o status HTTP correto.
 * Com AI_FALLBACK_ENABLED=false, erros do provedor também são propagados.
 */
function shouldFallback(error: unknown): error is AiProviderError {
  return env.aiFallbackEnabled && error instanceof AiProviderError && error.status !== 499;
}

function logProviderFailure(res: Response, operation: string, error: AiProviderError): void {
  const cause = error.cause instanceof Error ? `${error.cause.name}: ${error.cause.message}` : undefined;
  const log = error.code === 'AI_PROVIDER_AUTH' ? console.error : console.warn;
  log(`[ai] ${operation} falhou — usando fallback`, {
    requestId: res.locals.requestId,
    code: error.code,
    cause,
  });
}

export async function chat(req: Request, res: Response): Promise<void> {
  const input = validateChatRequest(req.body);
  const profile = selectChatProfile(input.role, input.modelPreference);

  let reply: string;
  let meta: ApiMeta | undefined;
  try {
    reply = await generateChatReply(input.messages, profile, clientDisconnectSignal(res));
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    logProviderFailure(res, 'chat', error);
    reply = buildChatFallback(input.messages, input.role);
    meta = { fallback: true, fallbackReason: error.code };
  }

  sendSuccess<ChatResponseData>(res, { reply, modelUsed: profile.model }, meta);
}

export async function generateImageHandler(req: Request, res: Response): Promise<void> {
  const input = validateImageRequest(req.body);

  let result: { imageUrl: string; description: string };
  let meta: ApiMeta | undefined;
  try {
    result = await generateImage(input, clientDisconnectSignal(res));
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    logProviderFailure(res, 'generate-image', error);
    result = buildImageFallback(input.prompt, input.imageSize);
    meta = { fallback: true, fallbackReason: error.code };
  }

  sendSuccess<ImageResponseData>(
    res,
    {
      imageUrl: result.imageUrl,
      description: result.description,
      modelUsed: GEMINI_IMAGE_MODEL,
      imageSize: input.imageSize,
      aspectRatio: input.aspectRatio,
      prompt: input.prompt,
    },
    meta
  );
}
