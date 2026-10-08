import express from 'express';
import { createOrder } from '../controllers/orderController.ts';
import { orderLimiter } from '../middleware/rateLimiter.ts';
import { asyncHandler } from '../utils/http.ts';

export const orderRoutes = express.Router();

// 50 linhas com observações de 200 caracteres cabem com folga em 32 KB.
orderRoutes.post('/', orderLimiter, express.json({ limit: '32kb' }), asyncHandler(createOrder));
