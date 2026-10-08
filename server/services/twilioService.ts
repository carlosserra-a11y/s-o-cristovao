import { env } from '../config/env.ts';
import { AppError } from '../errors/AppError.ts';
import { isE164 } from '../../shared/phone.ts';

/**
 * Envio de mensagens WhatsApp pela API REST da Twilio.
 *
 * - Credenciais (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN) existem só no servidor.
 * - Usa fetch nativo + Basic Auth (sem o SDK `twilio`, ~2 MB a menos de dependências).
 * - Timeout via AbortSignal e erros da Twilio traduzidos para códigos estáveis.
 */

interface TwilioErrorBody {
  code?: number;
  message?: string;
}

export interface SentMessage {
  sid: string;
  status: string;
}

/** Códigos Twilio de destinatário inválido / sem WhatsApp. */
const INVALID_RECIPIENT_CODES = new Set([21211, 21214, 21614, 63003, 63024]);
const RATE_LIMIT_CODES = new Set([20429, 63018]);

export function isTwilioConfigured(): boolean {
  const { accountSid, authToken, whatsappFrom, storeWhatsappTo } = env.twilio;
  return (
    /^AC[0-9a-fA-F]{32}$/.test(accountSid) &&
    authToken.length >= 16 &&
    isE164(whatsappFrom) &&
    isE164(storeWhatsappTo)
  );
}

function translateTwilioError(status: number, body: TwilioErrorBody): AppError {
  const cause = new Error(`Twilio HTTP ${status} code=${body.code ?? '-'}: ${body.message ?? 'sem mensagem'}`);

  if (status === 401 || status === 403 || body.code === 20003) {
    return new AppError('WHATSAPP_NOT_CONFIGURED', 'O envio pelo WhatsApp está temporariamente indisponível.', { cause });
  }
  if (body.code !== undefined && INVALID_RECIPIENT_CODES.has(body.code)) {
    return new AppError('WHATSAPP_INVALID_RECIPIENT', 'Este número não pode receber mensagens no WhatsApp.', { cause });
  }
  if (status === 429 || (body.code !== undefined && RATE_LIMIT_CODES.has(body.code))) {
    return new AppError('WHATSAPP_RATE_LIMITED', 'Muitos pedidos ao mesmo tempo. Tente novamente em instantes.', { cause });
  }
  return new AppError('WHATSAPP_SEND_FAILED', 'Não conseguimos enviar seu pedido agora. Tente novamente.', { cause });
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<SentMessage> {
  if (!isTwilioConfigured()) {
    throw new AppError('WHATSAPP_NOT_CONFIGURED', 'O envio pelo WhatsApp está temporariamente indisponível.', {
      cause: new Error('Variáveis TWILIO_* / STORE_WHATSAPP_TO ausentes ou inválidas.'),
    });
  }
  if (!isE164(to)) {
    throw new AppError('WHATSAPP_INVALID_RECIPIENT', 'Número de WhatsApp inválido.');
  }

  const { accountSid, authToken, whatsappFrom, apiBaseUrl, timeoutMs } = env.twilio;
  const url = `${apiBaseUrl}/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const form = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: `whatsapp:${whatsappFrom}`,
    Body: body.slice(0, 1600), // limite da Twilio por mensagem
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new AppError('WHATSAPP_TIMEOUT', 'O WhatsApp demorou para responder. Tente novamente.', { cause: error });
    }
    throw new AppError('WHATSAPP_SEND_FAILED', 'Não conseguimos enviar seu pedido agora. Tente novamente.', {
      cause: error,
    });
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // corpo vazio ou não-JSON
  }

  if (!response.ok) {
    throw translateTwilioError(response.status, (payload ?? {}) as TwilioErrorBody);
  }

  const { sid, status } = (payload ?? {}) as Partial<SentMessage>;
  return { sid: sid ?? 'unknown', status: status ?? 'queued' };
}
