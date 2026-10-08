import express from 'express';
import { storeStatus } from '../controllers/storeController.ts';

export const storeRoutes = express.Router();

storeRoutes.get('/status', storeStatus);
