import type {
  ApiErrorCode,
  ApiResponse,
  ApiSuccess,
  ChatRequestBody,
  ChatResponseData,
  ImageRequestBody,
  ImageResponseData,
  StoreStatusData,
} from '../../shared/api';

export type ClientErrorCode = ApiErrorCode | 'NETWORK_ERROR' | 'ABORTED' | 'BAD_RESPONSE' | 'NO_BACKEND';

/** Build estático (GitHub Pages): não existe servidor Express, então a API nem é chamada. */
const IS_STATIC_SITE = import.meta.env.VITE_STATIC_SITE === 'true';

export class ApiRequestError extends Error {
  readonly code: ClientErrorCode;
  readonly status: number;

  constructor(message: string, code: ClientErrorCode, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

/**
 * true quando não há backend respondendo (sem rede, ou hospedagem estática
 * como o GitHub Pages devolvendo 404/405 em HTML). Nesses casos a UI usa as
 * respostas de contingência locais; erros reais da API continuam visíveis.
 */
export const isBackendUnavailable = (error: unknown): boolean =>
  error instanceof ApiRequestError &&
  (error.code === 'NETWORK_ERROR' || error.code === 'BAD_RESPONSE' || error.code === 'NO_BACKEND');

const isEnvelope = <T>(value: unknown): value is ApiResponse<T> =>
  typeof value === 'object' && value !== null && 'success' in value;

async function request<T>(url: string, init: RequestInit): Promise<ApiSuccess<T>> {
  if (IS_STATIC_SITE) {
    throw new ApiRequestError('Versão estática: servidor indisponível.', 'NO_BACKEND', 0);
  }
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiRequestError('Requisição cancelada.', 'ABORTED', 0);
    }
    throw new ApiRequestError('Sem conexão com o servidor. Verifique sua internet.', 'NETWORK_ERROR', 0);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Corpo vazio ou não-JSON (ex.: proxy retornando HTML).
  }

  if (!isEnvelope<T>(body)) {
    throw new ApiRequestError(
      response.ok ? 'Resposta inesperada do servidor.' : `Erro ${response.status} no servidor.`,
      'BAD_RESPONSE',
      response.status
    );
  }
  if (!body.success) {
    throw new ApiRequestError(body.error.message, body.error.code, response.status);
  }
  return body;
}

const postJson = <T>(url: string, payload: unknown, signal?: AbortSignal) =>
  request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

export const api = {
  chat: (payload: ChatRequestBody, signal?: AbortSignal) =>
    postJson<ChatResponseData>('/api/chat', payload, signal),
  generateImage: (payload: ImageRequestBody, signal?: AbortSignal) =>
    postJson<ImageResponseData>('/api/generate-image', payload, signal),
  storeStatus: (signal?: AbortSignal) =>
    request<StoreStatusData>('/api/store/status', { method: 'GET', signal }),
};
