/**
 * Configuração pública do frontend (nada aqui é segredo — vai para o bundle).
 * Credenciais da Twilio/Gemini ficam exclusivamente no servidor.
 */

/** WhatsApp da loja (só dígitos, com DDI) para o envio direto pelo app do WhatsApp. */
export const STORE_WHATSAPP_NUMBER = (import.meta.env.VITE_STORE_WHATSAPP_NUMBER || '5548999999999').replace(/\D/g, '');

export const buildWhatsAppLink = (message: string): string =>
  `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

/**
 * Vídeo do Hero (caminho relativo ao site). Padrão: o vídeo gerado com
 * Seedance 2.0 em public/media/hero-burger.mp4 (720p, 16:9, 5s, sem áudio).
 * Defina VITE_HERO_VIDEO_SRC para trocar, ou "none" para desativar.
 */
const heroVideoEnv = import.meta.env.VITE_HERO_VIDEO_SRC || 'media/hero-burger.mp4';
export const HERO_VIDEO_SRC = heroVideoEnv === 'none' ? '' : heroVideoEnv;
export const HERO_VIDEO_POSTER = import.meta.env.VITE_HERO_VIDEO_POSTER || '';
