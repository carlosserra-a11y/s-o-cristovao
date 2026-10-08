import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

/** "1" → 1 hop · "true"/"false" · lista de IPs/sub-redes → repassado ao Express. */
const parseTrustProxy = (value: string | undefined, isProd: boolean): boolean | number | string => {
  if (value === undefined || value === '') return isProd ? 1 : false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  const asNumber = Number(value);
  return Number.isInteger(asNumber) ? asNumber : value;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProd = nodeEnv === 'production';

/**
 * Configuração centralizada e validada na inicialização.
 * GEMINI_API_KEY vive SOMENTE aqui (servidor) — nunca use o prefixo VITE_,
 * que exporia a chave no bundle do navegador.
 */
export const env = Object.freeze({
  nodeEnv,
  isProd,
  port: parseNumber(process.env.PORT, 3000),
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() ?? '',
  /** Quando true, falhas do provedor de IA retornam respostas de contingência (com meta.fallback). */
  aiFallbackEnabled: parseBoolean(process.env.AI_FALLBACK_ENABLED, true),
  chatTimeoutMs: parseNumber(process.env.AI_CHAT_TIMEOUT_MS, 30_000),
  imageTimeoutMs: parseNumber(process.env.AI_IMAGE_TIMEOUT_MS, 90_000),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY, isProd),
  /** Origens autorizadas a embutir o site em iframe (ex.: preview do AI Studio). */
  frameAncestors: (process.env.FRAME_ANCESTORS ?? '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean),
  rateLimit: {
    apiPerMinute: parseNumber(process.env.RATE_LIMIT_API_PER_MINUTE, 120),
    chatPerMinute: parseNumber(process.env.RATE_LIMIT_CHAT_PER_MINUTE, 20),
    imagePer10Minutes: parseNumber(process.env.RATE_LIMIT_IMAGE_PER_10_MINUTES, 5),
  },
});

export const isGeminiConfigured = (): boolean =>
  env.geminiApiKey.length > 0 && env.geminiApiKey !== 'MY_GEMINI_API_KEY';
