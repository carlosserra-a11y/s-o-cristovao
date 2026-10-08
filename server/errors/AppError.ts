import type { ApiErrorCode } from '../../shared/api.ts';

export const DEFAULT_ERROR_STATUS: Record<ApiErrorCode, number> = {
  INVALID_PAYLOAD: 400,
  INVALID_JSON: 400,
  PAYLOAD_TOO_LARGE: 413,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  AI_PROVIDER_UNAVAILABLE: 503,
  AI_PROVIDER_TIMEOUT: 504,
  AI_PROVIDER_RATE_LIMITED: 503,
  AI_PROVIDER_AUTH: 502,
  AI_PROVIDER_BAD_REQUEST: 502,
  AI_MODEL_UNAVAILABLE: 503,
  AI_EMPTY_RESPONSE: 502,
  ORDER_BELOW_MINIMUM: 400,
  FORBIDDEN_ORIGIN: 403,
  WHATSAPP_NOT_CONFIGURED: 503,
  WHATSAPP_INVALID_RECIPIENT: 400,
  WHATSAPP_SEND_FAILED: 502,
  WHATSAPP_RATE_LIMITED: 503,
  WHATSAPP_TIMEOUT: 504,
  INTERNAL_ERROR: 500,
};

interface AppErrorOptions {
  status?: number;
  details?: string[];
  cause?: unknown;
}

/**
 * Erro de domínio com status HTTP e código estável. A `message` é segura para
 * exibir ao usuário; detalhes técnicos ficam em `cause` (apenas nos logs).
 */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: string[];

  constructor(code: ApiErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = options.status ?? DEFAULT_ERROR_STATUS[code];
    this.details = options.details;
  }
}

/** Erros vindos do provedor de IA (Gemini) — elegíveis para resposta de contingência. */
export class AiProviderError extends AppError {
  constructor(code: ApiErrorCode, message: string, options: AppErrorOptions = {}) {
    super(code, message, options);
    this.name = 'AiProviderError';
  }
}
