import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { FakeDb, config, merchantId } from './support/fakeDb.js';

function fixture(name: string): string {
  return readFileSync(
    new URL(
      `../../../packages/payments-core/test/fixtures/${name}`,
      import.meta.url,
    ),
    'utf8',
  );
}

describe('PayGrid V2 API flow', () => {
  it('creates, captures, and refunds through the selected provider', async () => {
    const calls: Array<{
      url: string;
      headers: Record<string, string>;
      body: unknown;
    }> = [];
    const fetcher = vi.fn(async (url: URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      calls.push({
        url: String(url),
        headers,
        body: JSON.parse(String(init?.body)),
      });
      if (String(url).endsWith('/refunds'))
        return new Response(fixture('paygrid-v2-refund.json'), { status: 201 });
      if (String(url).endsWith('/capture'))
        return new Response(fixture('paygrid-v2-captured.json'), {
          status: 200,
        });
      return new Response(fixture('paygrid-v2-authorized.json'), {
        status: 201,
      });
    });
    vi.stubGlobal('fetch', fetcher);
    try {
      const db = new FakeDb();
      const enabled = { ...config, PAYMENTS_PROVIDER_V2: true };
      const app = createApp({ db, config: enabled });
      const token = jwt.sign(
        { mid: merchantId, scope: ['payments:write'] },
        config.JWT_SECRET,
      );
      const auth = { authorization: `Bearer ${token}` };

      const created = await request(app)
        .post('/payments')
        .set(auth)
        .set('Idempotency-Key', 'v2-create-key')
        .send({
          amountCents: 1250,
          currency: 'USD',
          customer: { email: 'buyer@example.com' },
          paymentMethod: { token: 'pm_demo_visa_4242' },
        });
      expect(created.status).toBe(201);
      expect(created.body.providerChargeId).toBe('v2_charge_demo');
      const paymentId = created.body.id as string;
      const capture = await request(app)
        .post(`/payments/${paymentId}/capture`)
        .set(auth)
        .set('Idempotency-Key', 'v2-capture-key')
        .send({});
      expect(capture.status).toBe(200);
      expect(capture.body.status).toBe('captured');
      const refund = await request(app)
        .post(`/payments/${paymentId}/refund`)
        .set(auth)
        .set('Idempotency-Key', 'v2-refund-key')
        .send({});
      expect(refund.status).toBe(201);
      expect(refund.body.status).toBe('succeeded');

      expect(calls).toHaveLength(3);
      expect(calls.map((call) => call.headers['idempotency-key'])).toEqual([
        'v2-create-key',
        'v2-capture-key',
        'v2-refund-key',
      ]);
      expect(calls.map((call) => call.url)).toEqual([
        'https://paygrid-v2.example.com/v2/charges',
        'https://paygrid-v2.example.com/v2/charges/v2_charge_demo/capture',
        'https://paygrid-v2.example.com/v2/charges/v2_charge_demo/refunds',
      ]);
      expect(calls[0]?.body).toMatchObject({
        amount: { amount: 1250, currency: 'USD' },
        capture: false,
      });
      expect(Object.values(db.payments)[0]?.status).toBe('refunded');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('records a declined charge without offering capture', async () => {
    const declined = JSON.parse(
      fixture('paygrid-v2-authorized.json'),
    ) as Record<string, unknown>;
    declined.state = 'declined';
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify(declined), { status: 201 }),
    );
    vi.stubGlobal('fetch', fetcher);
    try {
      const db = new FakeDb();
      const app = createApp({
        db,
        config: { ...config, PAYMENTS_PROVIDER_V2: true },
      });
      const token = jwt.sign({ mid: merchantId }, config.JWT_SECRET);
      const auth = { authorization: `Bearer ${token}` };
      const created = await request(app)
        .post('/payments')
        .set(auth)
        .set('Idempotency-Key', 'declined-create')
        .send({
          amountCents: 1250,
          customer: { email: 'buyer@example.com' },
          paymentMethod: { token: 'pm_demo_visa_4242' },
        });
      expect(created.status).toBe(201);
      expect(created.body.status).toBe('failed');
      const capture = await request(app)
        .post(`/payments/${created.body.id}/capture`)
        .set(auth)
        .set('Idempotency-Key', 'declined-capture')
        .send({});
      expect(capture.status).toBe(409);
      expect(Object.values(db.payments)[0]?.status).toBe('failed');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps the payment authorized if capture is not completed', async () => {
    const fetcher = vi.fn(async (url: URL) => {
      if (String(url).endsWith('/capture'))
        return new Response(fixture('paygrid-v2-authorized.json'), {
          status: 200,
        });
      return new Response(fixture('paygrid-v2-authorized.json'), {
        status: 201,
      });
    });
    vi.stubGlobal('fetch', fetcher);
    try {
      const db = new FakeDb();
      const app = createApp({
        db,
        config: { ...config, PAYMENTS_PROVIDER_V2: true },
      });
      const token = jwt.sign({ mid: merchantId }, config.JWT_SECRET);
      const auth = { authorization: `Bearer ${token}` };
      const created = await request(app)
        .post('/payments')
        .set(auth)
        .set('Idempotency-Key', 'capture-check-create')
        .send({
          amountCents: 1250,
          customer: { email: 'buyer@example.com' },
          paymentMethod: { token: 'pm_demo_visa_4242' },
        });
      expect(created.status).toBe(201);
      const capture = await request(app)
        .post(`/payments/${created.body.id}/capture`)
        .set(auth)
        .set('Idempotency-Key', 'capture-check')
        .send({});
      expect(capture.status).toBe(502);
      expect(capture.body.code).toBe('provider_capture_failed');
      expect(Object.values(db.payments)[0]?.status).toBe('authorized');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not record a refund that the provider reports as failed', async () => {
    const failedRefund = JSON.parse(
      fixture('paygrid-v2-refund.json'),
    ) as Record<string, unknown>;
    failedRefund.state = 'failed';
    const fetcher = vi.fn(async (url: URL) => {
      if (String(url).endsWith('/refunds'))
        return new Response(JSON.stringify(failedRefund), { status: 200 });
      if (String(url).endsWith('/capture'))
        return new Response(fixture('paygrid-v2-captured.json'), {
          status: 200,
        });
      return new Response(fixture('paygrid-v2-authorized.json'), {
        status: 201,
      });
    });
    vi.stubGlobal('fetch', fetcher);
    try {
      const db = new FakeDb();
      const app = createApp({
        db,
        config: { ...config, PAYMENTS_PROVIDER_V2: true },
      });
      const token = jwt.sign({ mid: merchantId }, config.JWT_SECRET);
      const auth = { authorization: `Bearer ${token}` };
      const created = await request(app)
        .post('/payments')
        .set(auth)
        .set('Idempotency-Key', 'failed-refund-create')
        .send({
          amountCents: 1250,
          customer: { email: 'buyer@example.com' },
          paymentMethod: { token: 'pm_demo_visa_4242' },
        });
      expect(created.status).toBe(201);
      const paymentId = created.body.id as string;
      expect(
        (
          await request(app)
            .post(`/payments/${paymentId}/capture`)
            .set(auth)
            .set('Idempotency-Key', 'failed-refund-capture')
            .send({})
        ).status,
      ).toBe(200);
      const refund = await request(app)
        .post(`/payments/${paymentId}/refund`)
        .set(auth)
        .set('Idempotency-Key', 'failed-refund')
        .send({});
      expect(refund.status).toBe(502);
      expect(refund.body.code).toBe('provider_refund_failed');
      expect(Object.values(db.refunds)).toHaveLength(0);
      expect(Object.values(db.payments)[0]?.status).toBe('captured');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
