import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ApiFailure, ApiMeta, ApiSuccess } from '../../shared/api.ts';
import type { AppError } from '../errors/AppError.ts';

export function sendSuccess<T>(res: Response, data: T, meta?: ApiMeta, status = 200): void {
  const body: ApiSuccess<T> = meta ? { success: true, data, meta } : { success: true, data };
  res.status(status).json(body);
}

export function sendError(res: Response, error: AppError): void {
  const body: ApiFailure = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details?.length ? { details: error.details } : {}),
    },
  };
  res.status(error.status).json(body);
}

/** Express 4 não captura rejeições de handlers async: encaminha para o errorHandler. */
export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    handler(req, res, next).catch(next);
  };

/** AbortSignal disparado quando o cliente desconecta antes da resposta (economiza chamadas à IA). */
export function clientDisconnectSignal(res: Response): AbortSignal {
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });
  return controller.signal;
}
