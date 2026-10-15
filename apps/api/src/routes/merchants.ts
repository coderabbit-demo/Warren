import { Router } from 'express';
import { z } from 'zod';
import type { RequestHandler } from 'express';
import type { MerchantsRepository } from '../repositories/merchants.js';
import { NotFoundError } from '../errors.js';

const profileSchema = z.object({ name: z.string().min(1).max(120) });

export function merchantsRouter(merchants: MerchantsRepository, requireAuth: RequestHandler) {
  const router = Router();
  router.get('/merchants/me', requireAuth, async (req, res) => {
    const merchant = await merchants.findById(req.auth.merchantId);
    if (!merchant) throw new NotFoundError('merchant');
    res.json(merchant);
  });
  router.patch('/merchants/me', requireAuth, async (req, res) => {
    const body = profileSchema.parse(req.body);
    const merchant = await merchants.updateProfile(req.auth.merchantId, body.name);
    if (!merchant) throw new NotFoundError('merchant');
    res.json(merchant);
  });
  return router;
}
