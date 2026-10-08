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
import type { OrderRequestBody, OrderResponseData } from '../../shared/order';

export type ClientErrorCode = ApiErrorCode | 'NETWORK_ERROR' | 'ABORTED' | 'TIMEOUT' | 'BAD_RESPONSE' | 'NO_BACKEND';

/**
 * Endereço do backend. Vazio = mesma origem (site servido pelo Express).
 * No GitHub Pages, defina VITE_API_BASE_URL com a URL do servidor Node
 * (e libere a origem do site em CORS_ORIGINS no servidor).
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

/** Build estático sem backend configurado: a API nem é chamada (evita 404 no console). */
const IS_STATIC_SITE = import.meta.env.VITE_STATIC_SITE === 'true' && API_BASE_URL === '';

export const hasBackend = !IS_STATIC_SITE;

export class ApiRequestError extends Error {
  readonly code: ClientErrorCode;
  readonly status: number;
  readonly details: string[];

  constructor(message: string, code: ClientErrorCode, status: number, details: string[] = []) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.details = details;
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

async function request<T>(path: string, init: RequestInit, timeoutMs?: number): Promise<ApiSuccess<T>> {
  if (IS_STATIC_SITE) {
    throw new ApiRequestError('Versão estática: servidor indisponível.', 'NO_BACKEND', 0);
  }
  const timeoutSignal = timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined;
  const signal =
    init.signal && timeoutSignal ? AbortSignal.any([init.signal, timeoutSignal]) : (init.signal ?? timeoutSignal);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, signal });
  } catch (err) {
    if (timeoutSignal?.aborted) {
      throw new ApiRequestError('O servidor demorou para responder. Tente novamente.', 'TIMEOUT', 0);
    }
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
    throw new ApiRequestError(body.error.message, body.error.code, response.status, body.error.details);
  }
  return body;
}

const postJson = <T>(path: string, payload: unknown, signal?: AbortSignal, timeoutMs?: number) =>
  request<T>(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    },
    timeoutMs
  );

const ORDER_TIMEOUT_MS = 25_000;

export const api = {
  chat: (payload: ChatRequestBody, signal?: AbortSignal) =>
    postJson<ChatResponseData>('/api/chat', payload, signal),
  generateImage: (payload: ImageRequestBody, signal?: AbortSignal) =>
    postJson<ImageResponseData>('/api/generate-image', payload, signal),
  createOrder: (payload: OrderRequestBody, signal?: AbortSignal) =>
    postJson<OrderResponseData>('/api/orders', payload, signal, ORDER_TIMEOUT_MS),
  storeStatus: (signal?: AbortSignal) =>
    request<StoreStatusData>('/api/store/status', { method: 'GET', signal }),
};
