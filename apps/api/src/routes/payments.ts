import { Router } from 'express';
import { z } from 'zod';
import type { RequestHandler } from 'express';
import type { PaymentService } from '../services/paymentService.js';
import type { PaymentsRepository } from '../repositories/payments.js';
import { NotFoundError } from '../errors.js';
import type { makeWithIdempotency } from '../middleware/idempotency.js';

const createPaymentSchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.literal('USD').default('USD'),
  customer: z.object({ email: z.email() }),
  paymentMethod: z.object({
    token: z.string().optional(),
    card: z.object({ number: z.string(), expMonth: z.number(), expYear: z.number(), cvc: z.string() }).optional(),
  }),
});

export function paymentsRouter(service: PaymentService, payments: PaymentsRepository, requireAuth: RequestHandler, withIdempotency: ReturnType<typeof makeWithIdempotency>) {
  const router = Router();
  router.post('/payments', requireAuth, async (req, res) => {
    const body = createPaymentSchema.parse(req.body);
    const result = await withIdempotency(req, async () => ({
      status: 201,
      body: await service.create(req.auth.merchantId, { amountCents: body.amountCents, currency: body.currency, customerEmail: body.customer.email, paymentMethod: body.paymentMethod }),
    }));
    res.status(result.status).json(result.body);
  });
  router.post('/payments/:id/capture', requireAuth, async (req, res) => {
    const result = await withIdempotency(req, async () => ({ status: 200, body: await service.capture(req.auth.merchantId, String(req.params.id)) }));
    res.status(result.status).json(result.body);
  });
  router.get('/payments/:id', requireAuth, async (req, res) => {
    const payment = await payments.findByIdForMerchant(String(req.params.id), req.auth.merchantId);
    if (!payment) throw new NotFoundError('payment');
    res.json(payment);
  });
  return router;
}
