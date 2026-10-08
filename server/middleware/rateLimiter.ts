import rateLimit from 'express-rate-limit';
import { env } from '../config/env.ts';
import { AppError } from '../errors/AppError.ts';
import { sendError } from '../utils/http.ts';

/**
 * Limites por IP. A geração de imagens é a operação mais cara do Gemini,
 * então tem a política mais restritiva. Valores ajustáveis por variáveis de
 * ambiente (ver .env.example).
 */
function createLimiter(windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      sendError(res, new AppError('RATE_LIMITED', message));
    },
  });
}

/** Proteção geral de todas as rotas /api. */
export const apiLimiter = createLimiter(
  60_000,
  env.rateLimit.apiPerMinute,
  'Muitas requisições em pouco tempo. Aguarde um instante.'
);

export const chatLimiter = createLimiter(
  60_000,
  env.rateLimit.chatPerMinute,
  'Você enviou muitas mensagens seguidas. Aguarde um minuto e tente novamente.'
);

export const imageLimiter = createLimiter(
  10 * 60_000,
  env.rateLimit.imagePer10Minutes,
  'Limite de geração de imagens atingido. Tente novamente em alguns minutos.'
);
