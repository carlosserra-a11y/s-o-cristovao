import type { Request, Response } from 'express';
import type { OrderResponseData } from '../../shared/order.ts';
import { validateAndPriceOrder } from '../../shared/order.ts';
import { AppError } from '../errors/AppError.ts';
import { placeOrder } from '../services/orderService.ts';
import { sendSuccess } from '../utils/http.ts';

/** POST /api/orders — valida, recalcula preços e envia o pedido ao WhatsApp da loja. */
export async function createOrder(req: Request, res: Response): Promise<void> {
  const result = validateAndPriceOrder(req.body);
  if (!result.ok) {
    const message =
      result.code === 'ORDER_BELOW_MINIMUM' ? result.errors[0] : 'Confira os dados do pedido.';
    throw new AppError(result.code, message, { details: result.errors });
  }

  const data = await placeOrder(result.order, { requestId: res.locals.requestId as string | undefined });
  sendSuccess<OrderResponseData>(res, data, undefined, 201);
}
