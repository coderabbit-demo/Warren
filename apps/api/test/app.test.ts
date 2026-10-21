import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import type { PaymentProvider } from '@warren/payments-core';
import { createApp } from '../src/app.js';
import { FakeDb, config, merchantId } from './support/fakeDb.js';

function setup() {
  const db = new FakeDb();
  const provider: PaymentProvider = {
    name: 'paygrid-v1',
    createCharge: vi.fn(
      async ({
        amountCents,
      }: Parameters<PaymentProvider['createCharge']>[0]) => ({
        providerRef: 'ch_demo',
        state: 'authorized' as const,
        rawState: 'authorized',
        amountCents,
      }),
    ),
    capture: vi.fn(
      async ({ amountCents }: Parameters<PaymentProvider['capture']>[0]) => ({
        providerRef: 'ch_demo',
        state: 'captured' as const,
        rawState: 'settled',
        amountCents,
      }),
    ),
    refund: vi.fn(async () => ({
      providerRef: 're_demo',
      state: 'succeeded' as const,
    })),
  };
  const app = createApp({ db, config, provider });
  const token = jwt.sign(
    { mid: merchantId, scope: ['payments:write'] },
    config.JWT_SECRET,
  );
  const auth = { authorization: `Bearer ${token}` };
  return { app, db, auth, provider };
}

describe('Warren API', () => {
  it('creates, captures, and refunds a payment', async () => {
    const { app, db, auth, provider } = setup();
    const created = await request(app)
      .post('/payments')
      .set(auth)
      .set('Idempotency-Key', 'create-1')
      .send({
        amountCents: 1200,
        currency: 'USD',
        customer: { email: 'buyer@example.com' },
        paymentMethod: { token: 'pm_demo_visa_4242' },
      });
    expect(created.status).toBe(201);
    const paymentId = created.body.id as string;
    const captured = await request(app)
      .post(`/payments/${paymentId}/capture`)
      .set(auth)
      .set('Idempotency-Key', 'capture-1')
      .send({});
    expect(captured.body.status).toBe('captured');
    const fetched = await request(app).get(`/payments/${paymentId}`).set(auth);
    expect(fetched.body.capturedCents).toBe(1200);
    const refunded = await request(app)
      .post(`/payments/${paymentId}/refund`)
      .set(auth)
      .set('Idempotency-Key', 'refund-1')
      .send({ reason: 'Customer request' });
    expect(refunded.status).toBe(201);
    expect(Object.values(db.refunds)).toHaveLength(1);
    expect(provider.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'create-1' }),
    );
    expect(provider.capture).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'capture-1' }),
    );
    expect(provider.refund).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'refund-1' }),
    );
  });

  it('creates, lists, fetches, and exports an invoice', async () => {
    const { app, auth } = setup();
    const created = await request(app)
      .post('/invoices')
      .set(auth)
      .send({
        number: 'INV-100',
        customerName: 'Nora Vale',
        customerEmail: 'nora@example.com',
        lineItems: [
          {
            description: 'Coffee equipment',
            quantity: 2,
            unitAmountCents: 500,
          },
        ],
      });
    expect(created.status).toBe(201);
    expect(created.body.total_cents).toBe(1000);
    const invoiceId = created.body.id as string;
    expect((await request(app).get('/invoices').set(auth)).body).toHaveLength(
      1,
    );
    expect(
      (await request(app).get(`/invoices/${invoiceId}`).set(auth)).body.number,
    ).toBe('INV-100');
    const exportResponse = await request(app)
      .get(`/invoices/${invoiceId}/export`)
      .set(auth);
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.text).toContain('Coffee equipment');
  });

  it('reads and updates a merchant profile', async () => {
    const { app, auth } = setup();
    expect((await request(app).get('/merchants/me').set(auth)).body.name).toBe(
      'Northbeam Outfitters',
    );
    expect(
      (
        await request(app)
          .patch('/merchants/me')
          .set(auth)
          .send({ name: 'Kestrel Coffee Co.' })
      ).body.name,
    ).toBe('Kestrel Coffee Co.');
  });

  it('processes a provider status event', async () => {
    const { app, db, auth } = setup();
    await request(app)
      .post('/payments')
      .set(auth)
      .set('Idempotency-Key', 'create-2')
      .send({
        amountCents: 200,
        customer: { email: 'buyer@example.com' },
        paymentMethod: { token: 'pm_demo_visa_4242' },
      });
    const payload = JSON.stringify({ charge_id: 'ch_demo', state: 'settled' });
    const signature = createHmac('sha256', config.PROVIDER_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    const response = await request(app)
      .post('/provider/paygrid/webhooks')
      .set('content-type', 'application/json')
      .set('x-paygrid-signature', signature)
      .send(payload);
    expect(response.status).toBe(204);
    expect(Object.values(db.payments)[0]?.status).toBe('captured');
  });

  it('processes a signed PayGrid V2 charge event', async () => {
    const { app, db, auth } = setup();
    const created = await request(app)
      .post('/payments')
      .set(auth)
      .set('Idempotency-Key', 'create-v2-event')
      .send({
        amountCents: 300,
        customer: { email: 'buyer@example.com' },
        paymentMethod: { token: 'pm_demo_visa_4242' },
      });
    expect(created.status).toBe(201);
    const payload = JSON.stringify({
      id: 'evt_v2_demo',
      type: 'charge.captured',
      data: {
        charge_reference: 'ch_demo',
        amount: { amount: 300, currency: 'USD' },
      },
      created_at: '2026-10-15T12:05:00Z',
    });
    const signature = createHmac('sha256', config.PAYGRID_V2_WEBHOOK_SECRET!)
      .update(payload)
      .digest('hex');
    const response = await request(app)
      .post('/provider/paygrid/v2/webhooks')
      .set('content-type', 'application/json')
      .set('x-paygrid-v2-signature', signature)
      .send(payload);
    expect(response.status).toBe(204);
    expect(Object.values(db.payments)[0]?.status).toBe('captured');
  });
});
