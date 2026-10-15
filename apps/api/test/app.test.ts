import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import type { Db } from '../src/db.js';
import type { Config } from '../src/config.js';
import type { ProviderV1Client } from '@warren/payments-core';
import { createApp } from '../src/app.js';

const merchantId = '00000000-0000-4000-8000-000000000001';
const config: Config = {
  PORT: 3000,
  DATABASE_URL: 'postgres://example.com/warren',
  JWT_SECRET: 'example-jwt-secret-for-tests',
  PAYGRID_API_KEY: 'wrn_demo_4f9c2e7a1b8d3f60c5e9a2b7d4f1c8e3',
  PAYGRID_BASE_URL: 'https://paygrid.example.com',
  PROVIDER_WEBHOOK_SECRET: 'example-provider-secret-for-tests',
  WEBHOOK_SIGNING_SECRET: 'example-signing-secret-for-tests',
  LOG_LEVEL: 'silent',
};

class FakeDb implements Db {
  payments: Record<string, any> = {};
  invoices: Record<string, any> = {};
  refunds: Record<string, any> = {};
  idempotency: Record<string, any> = {};
  merchant = { id: merchantId, name: 'Northbeam Outfitters', webhook_url: null, webhook_signing_secret: null, created_at: new Date() };

  async query<T>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    const rows: any[] = [];
    if (text.startsWith('INSERT INTO payments')) {
      const [id, merchant_id, amount_cents, currency, status, provider_charge_id, customer_email] = params;
      const row = { id, merchant_id, amount_cents, captured_cents: 0, currency, status, provider_charge_id, customer_email, created_at: new Date(), updated_at: new Date() };
      this.payments[String(id)] = row;
      rows.push(row);
    } else if (text.startsWith('SELECT * FROM payments WHERE id')) {
      const row = this.payments[String(params[0])];
      if (row?.merchant_id === params[1]) rows.push(row);
    } else if (text.startsWith('SELECT * FROM payments WHERE provider_charge_id')) {
      const row = Object.values(this.payments).find((entry) => entry.provider_charge_id === params[0]);
      if (row) rows.push(row);
    } else if (text.startsWith('UPDATE payments')) {
      const row = this.payments[String(params[0])];
      if (row?.merchant_id === params[1]) {
        row.status = params[2];
        row.captured_cents = params[3];
        rows.push(row);
      }
    } else if (text.startsWith('INSERT INTO refunds')) {
      const [id, payment_id, merchant_id, amount_cents, reason] = params;
      const row = { id, payment_id, merchant_id, amount_cents, reason, status: 'succeeded', created_at: new Date() };
      this.refunds[String(id)] = row;
      rows.push(row);
    } else if (text.startsWith('SELECT * FROM refunds')) {
      rows.push(...Object.values(this.refunds).filter((row) => row.payment_id === params[0] && row.merchant_id === params[1]));
    } else if (text.startsWith('SELECT COALESCE(SUM(amount_cents)')) {
      const total = Object.values(this.refunds).filter((row) => row.payment_id === params[0] && row.status === params[1]).reduce((sum, row) => sum + Number(row.amount_cents), 0);
      rows.push({ total_cents: total });
    } else if (text.startsWith('INSERT INTO invoices')) {
      const [id, merchant_id, number, customer_name, customer_email, total_cents, line_items] = params;
      const row = { id, merchant_id, number, customer_name, customer_email, total_cents, line_items: JSON.parse(String(line_items)), status: 'open', created_at: new Date() };
      this.invoices[String(id)] = row;
      rows.push(row);
    } else if (text.startsWith('SELECT * FROM invoices WHERE id')) {
      const row = this.invoices[String(params[0])];
      if (row && (params.length === 1 || row.merchant_id === params[1])) rows.push(row);
    } else if (text.startsWith('SELECT * FROM invoices')) {
      rows.push(...Object.values(this.invoices).filter((row) => row.merchant_id === params[0]));
    } else if (text.startsWith('SELECT * FROM merchants')) {
      if (params[0] === merchantId) rows.push(this.merchant);
    } else if (text.startsWith('UPDATE merchants')) {
      if (params[0] === merchantId) { this.merchant.name = String(params[1]); rows.push(this.merchant); }
    } else if (text.startsWith('SELECT * FROM idempotency_keys')) {
      const saved = this.idempotency[`${params[0]}:${params[1]}`];
      if (saved) rows.push(saved);
    } else if (text.startsWith('INSERT INTO idempotency_keys')) {
      const [merchant_id, key, request_hash, response] = params;
      this.idempotency[`${merchant_id}:${key}`] = { merchant_id, key, request_hash, response: JSON.parse(String(response)), created_at: new Date() };
    } else if (!text.startsWith('INSERT INTO ledger_entries')) {
      throw new Error(`Unexpected SQL: ${text}`);
    }
    return { rows: rows as T[] };
  }
}

function setup() {
  const db = new FakeDb();
  const provider = {
    createCharge: async (amountCents: number) => ({ charge_id: 'ch_demo', state: 'authorized', amount_cents: amountCents }),
    capture: async (_chargeId: string, amountCents: number) => ({ charge_id: 'ch_demo', state: 'settled', amount_cents: amountCents }),
    refund: async () => ({ refund_id: 're_demo', state: 'succeeded' }),
  } as unknown as ProviderV1Client;
  const app = createApp({ db, config, provider });
  const token = jwt.sign({ mid: merchantId, scope: ['payments:write'] }, config.JWT_SECRET);
  const auth = { authorization: `Bearer ${token}` };
  return { app, db, auth };
}

describe('Warren API', () => {
  it('creates, captures, and refunds a payment', async () => {
    const { app, db, auth } = setup();
    const created = await request(app).post('/payments').set(auth).set('Idempotency-Key', 'create-1').send({ amountCents: 1200, currency: 'USD', customer: { email: 'buyer@example.com' }, paymentMethod: { token: 'pm_demo_visa_4242' } });
    expect(created.status).toBe(201);
    const paymentId = created.body.id as string;
    const captured = await request(app).post(`/payments/${paymentId}/capture`).set(auth).set('Idempotency-Key', 'capture-1').send({});
    expect(captured.body.status).toBe('settled');
    const fetched = await request(app).get(`/payments/${paymentId}`).set(auth);
    expect(fetched.body.capturedCents).toBe(1200);
    const refunded = await request(app).post(`/payments/${paymentId}/refund`).set(auth).set('Idempotency-Key', 'refund-1').send({ reason: 'Customer request' });
    expect(refunded.status).toBe(201);
    expect(Object.values(db.refunds)).toHaveLength(1);
  });

  it('creates, lists, fetches, and exports an invoice', async () => {
    const { app, auth } = setup();
    const created = await request(app).post('/invoices').set(auth).send({ number: 'INV-100', customerName: 'Nora Vale', customerEmail: 'nora@example.com', lineItems: [{ description: 'Coffee equipment', quantity: 2, unitAmountCents: 500 }] });
    expect(created.status).toBe(201);
    expect(created.body.total_cents).toBe(1000);
    const invoiceId = created.body.id as string;
    expect((await request(app).get('/invoices').set(auth)).body).toHaveLength(1);
    expect((await request(app).get(`/invoices/${invoiceId}`).set(auth)).body.number).toBe('INV-100');
    const exportResponse = await request(app).get(`/invoices/${invoiceId}/export`).set(auth);
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.text).toContain('Coffee equipment');
  });

  it('reads and updates a merchant profile', async () => {
    const { app, auth } = setup();
    expect((await request(app).get('/merchants/me').set(auth)).body.name).toBe('Northbeam Outfitters');
    expect((await request(app).patch('/merchants/me').set(auth).send({ name: 'Kestrel Coffee Co.' })).body.name).toBe('Kestrel Coffee Co.');
  });

  it('processes a provider status event', async () => {
    const { app, db, auth } = setup();
    await request(app).post('/payments').set(auth).set('Idempotency-Key', 'create-2').send({ amountCents: 200, customer: { email: 'buyer@example.com' }, paymentMethod: { token: 'pm_demo_visa_4242' } });
    const payload = JSON.stringify({ charge_id: 'ch_demo', state: 'settled' });
    const signature = createHmac('sha256', config.PROVIDER_WEBHOOK_SECRET).update(payload).digest('hex');
    const response = await request(app).post('/provider/paygrid/webhooks').set('content-type', 'application/json').set('x-paygrid-signature', signature).send(payload);
    expect(response.status).toBe(204);
    expect(Object.values(db.payments)[0]?.status).toBe('settled');
  });

  it('creates a valid partial refund and reports the total', async () => {
    const { app, auth } = setup();
    const created = await request(app).post('/payments').set(auth).set('Idempotency-Key', 'partial-create').send({
      amountCents: 1200,
      customer: { email: 'buyer@example.com' },
      paymentMethod: { token: 'pm_demo_visa_4242' },
    });
    expect(created.status).toBe(201);
    const paymentId = created.body.id as string;
    const capture = await request(app).post(`/payments/${paymentId}/capture`).set(auth).set('Idempotency-Key', 'partial-capture').send({});
    expect(capture.status).toBe(200);
    const response = await request(app).post(`/payments/${paymentId}/refunds`).set(auth).send({ amountCents: 500, reason: 'One returned item' });
    expect(response.status).toBe(201);
    expect(response.body.amountCents).toBe(500);
    expect(response.body.status).toBe('succeeded');
    const payment = await request(app).get(`/payments/${paymentId}`).set(auth);
    expect(payment.body.status).toBe('partially_refunded');
    const summary = await request(app).get(`/payments/${paymentId}/refunds/summary`).set(auth);
    expect(summary.body).toEqual({ paymentId, totalRefundedCents: 500, capturedCents: 1200 });
  });

  it('rejects a partial amount above the captured payment', async () => {
    const { app, db, auth } = setup();
    const created = await request(app).post('/payments').set(auth).set('Idempotency-Key', 'large-create').send({
      amountCents: 900,
      customer: { email: 'buyer@example.com' },
      paymentMethod: { token: 'pm_demo_visa_4242' },
    });
    expect(created.status).toBe(201);
    const paymentId = created.body.id as string;
    const capture = await request(app).post(`/payments/${paymentId}/capture`).set(auth).set('Idempotency-Key', 'large-capture').send({});
    expect(capture.status).toBe(200);
    const response = await request(app).post(`/payments/${paymentId}/refunds`).set(auth).send({ amountCents: 901 });
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('refund_exceeds_capture');
    expect(Object.values(db.refunds)).toHaveLength(0);
  });
});
