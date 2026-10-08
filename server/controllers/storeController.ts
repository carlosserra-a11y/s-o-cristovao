import type { Request, Response } from 'express';
import type { StoreStatusData } from '../../shared/api.ts';
import { getStoreStatus } from '../../shared/storeHours.ts';
import { sendSuccess } from '../utils/http.ts';

/** GET /api/store/status — mesma regra (shared/storeHours) usada pelo frontend. */
export function storeStatus(_req: Request, res: Response): void {
  const now = new Date();
  sendSuccess<StoreStatusData>(res, { ...getStoreStatus(now), serverTime: now.getTime() });
}
