import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors/AppError.ts';
import { sendError } from '../utils/http.ts';

interface BodyParserError extends Error {
  type?: string;
  status?: number;
}

const isBodyParserError = (err: unknown): err is BodyParserError =>
  err instanceof Error && typeof (err as BodyParserError).type === 'string';

/** 404 padronizado para rotas /api inexistentes (antes do fallback da SPA). */
export const apiNotFound: RequestHandler = (req, _res, next) => {
  next(new AppError('NOT_FOUND', `Rota ${req.method} ${req.originalUrl} não encontrada.`));
};

/**
 * Handler central: converte qualquer erro em resposta JSON padronizada
 * ({ success: false, error: { code, message } }) com o status HTTP correto.
 * Detalhes internos vão apenas para o log (com requestId), nunca ao cliente.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  let appError: AppError;
  if (err instanceof AppError) {
    appError = err;
  } else if (isBodyParserError(err) && err.type === 'entity.too.large') {
    appError = new AppError('PAYLOAD_TOO_LARGE', 'O conteúdo enviado é grande demais.');
  } else if (isBodyParserError(err) && err.type === 'entity.parse.failed') {
    appError = new AppError('INVALID_JSON', 'JSON inválido no corpo da requisição.');
  } else if (err instanceof Error && (err as BodyParserError).status === 404) {
    // express.static (fallthrough: false) para assets inexistentes.
    appError = new AppError('NOT_FOUND', 'Recurso não encontrado.');
  } else {
    appError = new AppError('INTERNAL_ERROR', 'Erro interno no servidor. Tente novamente.', { cause: err });
  }

  const logPayload = {
    requestId: res.locals.requestId as string | undefined,
    method: req.method,
    path: req.originalUrl,
    status: appError.status,
    code: appError.code,
    cause: appError.cause instanceof Error ? `${appError.cause.name}: ${appError.cause.message}` : undefined,
  };
  if (appError.status >= 500) {
    console.error('[api] erro', logPayload, appError.cause instanceof Error ? appError.cause.stack : '');
  } else {
    console.warn('[api] requisição rejeitada', logPayload);
  }

  sendError(res, appError);
};
