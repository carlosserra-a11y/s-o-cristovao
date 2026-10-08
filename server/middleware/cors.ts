import type { RequestHandler } from 'express';
import { env } from '../config/env.ts';
import { AppError } from '../errors/AppError.ts';

const ALLOWED_METHODS = 'GET, POST, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type';
const PREFLIGHT_MAX_AGE_SECONDS = '600';

/**
 * CORS com lista de permissões (CORS_ORIGINS), sem dependência extra.
 *
 * - Mesma origem (site servido por este Express): nada a fazer.
 * - Origem na lista (ex.: https://usuario.github.io): libera com Vary: Origin.
 * - Origem fora da lista: preflight recebe 403 e o navegador bloqueia a chamada.
 * Sem cookies/credenciais: a API não usa sessão.
 */
export const corsPolicy: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  res.vary('Origin');

  if (!origin) {
    next();
    return;
  }

  const selfOrigin = `${req.protocol}://${req.get('host')}`;
  const allowed = origin === selfOrigin || env.corsOrigins.includes(origin);

  if (allowed && origin !== selfOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id, RateLimit, RateLimit-Policy');
  }

  if (req.method === 'OPTIONS') {
    if (!allowed) {
      next(new AppError('FORBIDDEN_ORIGIN', 'Origem não autorizada.'));
      return;
    }
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.setHeader('Access-Control-Max-Age', PREFLIGHT_MAX_AGE_SECONDS);
    res.status(204).end();
    return;
  }

  next();
};
