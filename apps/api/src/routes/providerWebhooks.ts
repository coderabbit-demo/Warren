import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router, raw } from 'express';
import { z } from 'zod';
import type { Config } from '../config.js';
import { UnauthorizedError } from '../errors.js';
import type { PaymentService } from '../services/paymentService.js';
import { PaymentStatus } from '@warren/payments-core';
import { mapV2Webhook } from '@warren/payments-core';
import type { V2WebhookEvent } from '@warren/payments-core';

const webhookSchema = z.object({
  charge_id: z.string(),
  state: z.enum([PaymentStatus.Authorized, 'settled', PaymentStatus.Failed]),
});
const webhookV2Schema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'charge.authorized',
    'charge.captured',
    'charge.declined',
    'refund.succeeded',
  ]),
  data: z.object({
    charge_reference: z.string().min(1),
    amount: z.object({
      amount: z.number().int().nonnegative(),
      currency: z.string().length(3),
    }),
  }),
  created_at: z.iso.datetime(),
});

export function providerWebhooksRouter(
  service: PaymentService,
  config: Config,
) {
  const router = Router();
  router.post(
    '/provider/paygrid/webhooks',
    raw({ type: 'application/json' }),
    async (req, res) => {
      const rawBody = req.body as Buffer;
      const expected = createHmac('sha256', config.PROVIDER_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');
      if (req.header('x-paygrid-signature') !== expected)
        throw new UnauthorizedError('bad signature');
      const event = webhookSchema.parse(JSON.parse(rawBody.toString('utf8')));
      await service.recordProviderStatus(
        event.charge_id,
        event.state === 'settled' ? PaymentStatus.Captured : event.state,
      );
      res.status(204).send();
    },
  );
  router.post(
    '/provider/paygrid/v2/webhooks',
    raw({ type: 'application/json' }),
    async (req, res) => {
      const rawBody = req.body as Buffer;
      const signature = req.header('x-paygrid-v2-signature') ?? '';
      const secret = config.PAYGRID_V2_WEBHOOK_SECRET;
      if (!secret || !/^[a-f0-9]{64}$/i.test(signature))
        throw new UnauthorizedError('bad signature');
      const expected = createHmac('sha256', secret).update(rawBody).digest();
      const actual = Buffer.from(signature, 'hex');
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        throw new UnauthorizedError('bad signature');
      const event = webhookV2Schema.parse(
        JSON.parse(rawBody.toString('utf8')),
      ) as V2WebhookEvent;
      const update = mapV2Webhook(event);
      if (update)
        await service.recordProviderStatus(update.chargeId, update.status);
      res.status(204).send();
    },
  );
  return router;
}
