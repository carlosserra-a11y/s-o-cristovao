/**
 * Contratos HTTP compartilhados entre o servidor Express e o frontend React.
 * Mantê-los em um único arquivo evita divergência entre cliente e API.
 */

export type ChatRoleMode = 'fast' | 'sommelier' | 'expert';

export const CHAT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-pro-preview',
] as const;
export type ChatModel = (typeof CHAT_MODELS)[number];

export const IMAGE_SIZES = ['1K', '2K', '4K'] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

export const ASPECT_RATIOS = ['1:1', '16:9', '4:3', '9:16'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const IMAGE_STYLES = [
  'Dark Gourmet Gastronômico',
  'Estúdio Publicitário Quente',
  'Close-up Macro na Crosta',
  'Chapa Quente Rústica com Brasa',
] as const;
export type ImageStyle = (typeof IMAGE_STYLES)[number];

export const CHAT_LIMITS = {
  maxMessages: 30,
  maxMessageLength: 2000,
} as const;

export const IMAGE_LIMITS = {
  maxPromptLength: 600,
} as const;

export interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestBody {
  messages: ChatMessageInput[];
  role?: ChatRoleMode;
  modelPreference?: ChatModel;
}

export interface ChatResponseData {
  reply: string;
  modelUsed: string;
}

export interface ImageRequestBody {
  prompt: string;
  imageSize?: ImageSize;
  aspectRatio?: AspectRatio;
  style?: ImageStyle;
}

export interface ImageResponseData {
  imageUrl: string;
  modelUsed: string;
  imageSize: ImageSize;
  aspectRatio: AspectRatio;
  prompt: string;
  description: string;
}

export interface StoreStatusData {
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  timezone: string;
  localTime: string;
  minutesUntilChange: number;
  /** Epoch (ms) do servidor — permite ao cliente corrigir relógio desajustado. */
  serverTime: number;
}

export type ApiErrorCode =
  | 'INVALID_PAYLOAD'
  | 'INVALID_JSON'
  | 'PAYLOAD_TOO_LARGE'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_PROVIDER_RATE_LIMITED'
  | 'AI_PROVIDER_AUTH'
  | 'AI_PROVIDER_BAD_REQUEST'
  | 'AI_MODEL_UNAVAILABLE'
  | 'AI_EMPTY_RESPONSE'
  | 'ORDER_BELOW_MINIMUM'
  | 'FORBIDDEN_ORIGIN'
  | 'WHATSAPP_NOT_CONFIGURED'
  | 'WHATSAPP_INVALID_RECIPIENT'
  | 'WHATSAPP_SEND_FAILED'
  | 'WHATSAPP_RATE_LIMITED'
  | 'WHATSAPP_TIMEOUT'
  | 'INTERNAL_ERROR';

export interface ApiMeta {
  /** true quando a resposta veio do serviço de contingência e não do Gemini. */
  fallback?: boolean;
  /** Motivo da contingência (código de erro do provedor de IA). */
  fallbackReason?: ApiErrorCode;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: string[];
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
