import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import helmet from 'helmet';
import { env } from '../config/env.ts';

/**
 * Headers de segurança via Helmet.
 *
 * - Produção: CSP restritiva, liberando apenas o necessário para o app
 *   (Google Fonts, fotos do Unsplash, imagens data:/blob: geradas pela IA).
 * - Desenvolvimento: CSP desativada porque o Vite injeta scripts inline
 *   (preamble do React Refresh) e usa WebSocket de HMR. Os demais headers
 *   do Helmet continuam ativos.
 * - FRAME_ANCESTORS: permite embutir o app em iframe de origens confiáveis
 *   (ex.: preview do AI Studio). Sem ele, apenas a própria origem.
 */
export function securityHeaders(): RequestHandler {
  const frameAncestors = env.frameAncestors.length > 0 ? ["'self'", ...env.frameAncestors] : ["'self'"];

  return helmet({
    contentSecurityPolicy: env.isProd
      ? {
          useDefaults: true,
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'"],
            'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
            'img-src': ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
            'connect-src': ["'self'"],
            'frame-ancestors': frameAncestors,
            'object-src': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
          },
        }
      : false,
    // Necessário para carregar imagens de terceiros (Unsplash) sem CORP.
    crossOriginEmbedderPolicy: false,
    // X-Frame-Options não suporta lista de origens; com FRAME_ANCESTORS a CSP assume o controle.
    frameguard: env.frameAncestors.length > 0 ? false : { action: 'sameorigin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

/** Correlaciona logs e respostas: X-Request-Id em toda requisição. */
export const requestId: RequestHandler = (_req, res, next) => {
  const id = randomUUID();
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};

/** Respostas da API nunca devem ser cacheadas (conteúdo dinâmico/pessoal). */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};
