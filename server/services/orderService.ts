import { randomBytes } from 'node:crypto';
import { env } from '../config/env.ts';
import { AppError } from '../errors/AppError.ts';
import { formatCustomerConfirmation, formatOrderMessage } from '../../shared/order.ts';
import type { OrderResponseData, PricedOrder } from '../../shared/order.ts';
import { sendWhatsAppMessage } from './twilioService.ts';

// Sem caracteres ambíguos (0/O, 1/I) — fácil de ditar por telefone.
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateOrderId(): string {
  const bytes = randomBytes(6);
  let id = '';
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return `SC-${id}`;
}

interface PlaceOrderOptions {
  requestId?: string;
}

/**
 * Envia o pedido (já validado e precificado) ao WhatsApp da loja.
 * A confirmação ao cliente é opcional e nunca derruba o pedido se falhar.
 */
export async function placeOrder(order: PricedOrder, { requestId }: PlaceOrderOptions = {}): Promise<OrderResponseData> {
  const orderId = generateOrderId();

  try {
    await sendWhatsAppMessage(env.twilio.storeWhatsappTo, formatOrderMessage(orderId, order));
  } catch (error) {
    // Destinatário inválido aqui = número da LOJA mal configurado, não erro do cliente.
    if (error instanceof AppError && error.code === 'WHATSAPP_INVALID_RECIPIENT') {
      throw new AppError('WHATSAPP_NOT_CONFIGURED', 'O envio pelo WhatsApp está temporariamente indisponível.', {
        cause: error,
      });
    }
    throw error;
  }

  let customerNotified = false;
  if (env.twilio.notifyCustomer) {
    try {
      await sendWhatsAppMessage(order.customer.phone, formatCustomerConfirmation(orderId, order));
      customerNotified = true;
    } catch (error) {
      console.warn('[orders] confirmação ao cliente não enviada', {
        requestId,
        orderId,
        code: error instanceof AppError ? error.code : 'UNKNOWN',
      });
    }
  }

  return {
    orderId,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    createdAt: new Date().toISOString(),
    customerNotified,
  };
}
