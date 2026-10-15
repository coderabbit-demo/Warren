import { createHmac } from 'node:crypto';
import { Router, raw } from 'express';
import { z } from 'zod';
import type { Config } from '../config.js';
import { UnauthorizedError } from '../errors.js';
import type { PaymentService } from '../services/paymentService.js';
import { PaymentStatus } from '@warren/payments-core';

const webhookSchema = z.object({
  charge_id: z.string(),
  state: z.enum([PaymentStatus.Authorized, PaymentStatus.Settled, PaymentStatus.Failed]),
});

export function providerWebhooksRouter(service: PaymentService, config: Config) {
  const router = Router();
  router.post('/provider/paygrid/webhooks', raw({ type: 'application/json' }), async (req, res) => {
    const rawBody = req.body as Buffer;
    const expected = createHmac('sha256', config.PROVIDER_WEBHOOK_SECRET).update(rawBody).digest('hex');
    if (req.header('x-paygrid-signature') !== expected) throw new UnauthorizedError('bad signature');
    const event = webhookSchema.parse(JSON.parse(rawBody.toString('utf8')));
    await service.recordProviderStatus(event.charge_id, event.state);
    res.status(204).send();
  });
  return router;
}
