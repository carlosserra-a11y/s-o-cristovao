import express from 'express';
import { chat, generateImageHandler } from '../controllers/aiController.ts';
import { chatLimiter, imageLimiter } from '../middleware/rateLimiter.ts';
import { asyncHandler } from '../utils/http.ts';

/**
 * Apenas registro de rotas. Limites de corpo dimensionados por endpoint
 * (antes: 15 MB globais): 30 mensagens × 2.000 caracteres cabem em 160 KB
 * mesmo com acentos (UTF-8); o prompt de imagem tem no máximo 600 caracteres.
 */
export const aiRoutes = express.Router();

aiRoutes.post('/chat', chatLimiter, express.json({ limit: '160kb' }), asyncHandler(chat));
aiRoutes.post('/generate-image', imageLimiter, express.json({ limit: '8kb' }), asyncHandler(generateImageHandler));
