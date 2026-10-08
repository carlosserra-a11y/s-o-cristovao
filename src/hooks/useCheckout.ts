import { useCallback, useEffect, useRef, useState } from 'react';
import type { CartItem, Order, PaymentMethod } from '../types/burger';
import { api, ApiRequestError, hasBackend } from '../lib/api';
import { formatClock } from '../lib/format';
import { buildWhatsAppLink } from '../lib/config';
import { ORDER_LIMITS, formatOrderMessage, validateAndPriceOrder } from '../../shared/order';
import type { OrderRequestBody, PricedOrder } from '../../shared/order';
import { normalizeBrazilianMobile } from '../../shared/phone';

export interface CheckoutForm {
  name: string;
  phone: string;
  address: string;
  paymentMethod: PaymentMethod;
  changeFor: string;
}

export type FieldErrors = Partial<Record<'name' | 'phone' | 'address', string>>;

export type CheckoutStatus = 'idle' | 'submitting' | 'error';

export interface CheckoutError {
  message: string;
  details: string[];
  /** Oferece o envio direto pelo app do WhatsApp como alternativa. */
  offerWhatsAppLink: boolean;
}

/** Validação por campo (mensagens exibidas ao lado de cada input). */
export function validateCheckoutFields(form: CheckoutForm): FieldErrors {
  const errors: FieldErrors = {};
  const name = form.name.trim();
  if (name.length < ORDER_LIMITS.nameMin) errors.name = 'Informe seu nome.';
  if (!normalizeBrazilianMobile(form.phone)) errors.phone = 'Informe um celular com DDD, ex.: (48) 99999-9999.';
  if (form.address.trim().length < ORDER_LIMITS.addressMin) errors.address = 'Informe rua, número e bairro.';
  return errors;
}

const toRequestBody = (form: CheckoutForm, cart: CartItem[]): OrderRequestBody => ({
  customer: { name: form.name, phone: form.phone },
  address: form.address,
  paymentMethod: form.paymentMethod,
  ...(form.paymentMethod === 'cash' && form.changeFor.trim() ? { changeFor: form.changeFor } : {}),
  items: cart.map((ci) => ({ itemId: ci.item.id, quantity: ci.quantity, customization: ci.customization })),
});

const FALLBACK_CODES = new Set([
  'WHATSAPP_NOT_CONFIGURED',
  'WHATSAPP_SEND_FAILED',
  'WHATSAPP_TIMEOUT',
  'NETWORK_ERROR',
  'TIMEOUT',
  'BAD_RESPONSE',
  'INTERNAL_ERROR',
]);

function toCheckoutError(error: unknown): CheckoutError {
  if (!(error instanceof ApiRequestError)) {
    return { message: 'Algo deu errado ao enviar o pedido.', details: [], offerWhatsAppLink: true };
  }
  if (error.code === 'INVALID_PAYLOAD') {
    return { message: 'Confira os dados do pedido:', details: error.details, offerWhatsAppLink: false };
  }
  if (error.code === 'WHATSAPP_INVALID_RECIPIENT') {
    return {
      message: 'Este celular não pode receber mensagens no WhatsApp. Confira o número informado.',
      details: [],
      offerWhatsAppLink: false,
    };
  }
  if (FALLBACK_CODES.has(error.code)) {
    return {
      message: 'Não conseguimos enviar seu pedido automaticamente. Você pode enviá-lo direto pelo WhatsApp:',
      details: [],
      offerWhatsAppLink: true,
    };
  }
  // RATE_LIMITED, WHATSAPP_RATE_LIMITED, ORDER_BELOW_MINIMUM...: a mensagem do servidor já é amigável.
  return { message: error.message, details: [], offerWhatsAppLink: error.code !== 'ORDER_BELOW_MINIMUM' };
}

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function localOrderId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `SC-${Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('')}`;
}

function toOrder(id: string, priced: PricedOrder, cart: CartItem[], channel: Order['channel']): Order {
  return {
    id,
    items: [...cart],
    subtotal: priced.subtotal,
    deliveryFee: priced.deliveryFee,
    total: priced.total,
    address: priced.address,
    paymentMethod: priced.paymentMethod,
    changeFor: priced.changeFor,
    customerName: priced.customer.name,
    customerPhone: priced.customer.phone,
    channel,
    status: 'received',
    createdAt: formatClock(),
  };
}

/**
 * Fluxo de finalização: valida → envia ao backend (Twilio) → sucesso/erro.
 * Sem backend (site estático) ou com falha de envio, gera o link do WhatsApp
 * com o mesmo resumo que a loja receberia pela Twilio.
 */
export function useCheckout(cart: CartItem[], onSuccess: (order: Order) => void) {
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [error, setError] = useState<CheckoutError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Pedido validado/precificado localmente + link pronto para o WhatsApp. */
  const prepareWhatsAppLink = useCallback(
    (form: CheckoutForm): { href: string; finalize: () => void } | null => {
      const result = validateAndPriceOrder(toRequestBody(form, cart));
      if (!result.ok) return null;
      const id = localOrderId();
      return {
        href: buildWhatsAppLink(formatOrderMessage(id, result.order)),
        finalize: () => onSuccess(toOrder(id, result.order, cart, 'whatsapp-link')),
      };
    },
    [cart, onSuccess]
  );

  const submit = useCallback(
    async (form: CheckoutForm) => {
      if (status === 'submitting') return;
      const body = toRequestBody(form, cart);
      const local = validateAndPriceOrder(body);
      if (!local.ok) {
        setError({ message: 'Confira os dados do pedido:', details: local.errors, offerWhatsAppLink: false });
        setStatus('error');
        return;
      }

      setStatus('submitting');
      setError(null);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { data } = await api.createOrder(body, controller.signal);
        const order = toOrder(data.orderId, local.order, cart, 'twilio');
        // Totais oficiais vêm do servidor (recalculados a partir do cardápio).
        onSuccess({ ...order, subtotal: data.subtotal, deliveryFee: data.deliveryFee, total: data.total });
        setStatus('idle');
      } catch (err) {
        if (err instanceof ApiRequestError && err.code === 'ABORTED') return;
        setError(toCheckoutError(err));
        setStatus('error');
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [cart, onSuccess, status]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, submit, reset, prepareWhatsAppLink, hasBackend };
}
