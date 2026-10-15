import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { NotFoundError } from '../errors.js';
import type { MerchantsRepository } from '../repositories/merchants.js';
import type { WebhookTester } from '../services/webhookTester.js';

const webhookSchema = z.object({ url: z.string().url() });

export function merchantWebhooksRouter(
  merchants: MerchantsRepository,
  tester: WebhookTester,
  requireAuth: RequestHandler,
) {
  const router = Router();

  router.put('/merchants/me/webhook', requireAuth, async (req, res) => {
    const body = webhookSchema.parse(req.body);
    const endpoint = await merchants.saveWebhook(req.auth.merchantId, body.url);
    res.json({ url: endpoint.url, updatedAt: endpoint.updated_at });
  });

  router.post('/merchants/me/webhook/test', requireAuth, async (req, res) => {
    const endpoint = await merchants.findWebhook(req.auth.merchantId);
    if (!endpoint) throw new NotFoundError('webhook endpoint');
    res.json(await tester.send(endpoint.url, req.auth.merchantId));
  });

  return router;
}
