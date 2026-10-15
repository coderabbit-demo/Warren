import { Router } from 'express';
import { z } from 'zod';
import type { RequestHandler } from 'express';
import type { RefundService } from '../services/refundService.js';
import type { RefundsRepository } from '../repositories/refunds.js';
import type { makeWithIdempotency } from '../middleware/idempotency.js';

const fullRefundSchema = z.object({ reason: z.string().max(200).optional() });
const partialRefundSchema = z.object({
  amountCents: z.number().int().positive(),
  reason: z.string().max(200).optional(),
});

export function refundsRouter(service: RefundService, refunds: RefundsRepository, requireAuth: RequestHandler, withIdempotency: ReturnType<typeof makeWithIdempotency>) {
  const router = Router();
  router.post('/payments/:id/refund', requireAuth, async (req, res) => {
    const body = fullRefundSchema.parse(req.body);
    const result = await withIdempotency(req, async () => ({ status: 201, body: await service.createFullRefund(req.auth.merchantId, String(req.params.id), body.reason) }));
    res.status(result.status).json(result.body);
  });
  router.post('/payments/:id/refunds', requireAuth, async (req, res) => {
    const body = partialRefundSchema.parse(req.body);
    const refund = await service.createPartialRefund(req.auth.merchantId, String(req.params.id), body.amountCents, body.reason);
    res.status(201).json(refund);
  });
  router.get('/payments/:id/refunds/summary', requireAuth, async (req, res) => {
    res.json(await service.getRefundSummary(req.auth.merchantId, String(req.params.id)));
  });
  router.get('/payments/:id/refunds', requireAuth, async (req, res) => {
    res.json(await refunds.listForPayment(String(req.params.id), req.auth.merchantId));
  });
  return router;
}
