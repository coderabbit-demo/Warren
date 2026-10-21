import type { Db } from '../../src/db.js';
import type { Config } from '../../src/config.js';

export const merchantId = '00000000-0000-4000-8000-000000000001';
export const config: Config = {
  PORT: 3000,
  DATABASE_URL: 'postgres://example.com/warren',
  JWT_SECRET: 'example-jwt-secret-for-tests',
  PAYGRID_API_KEY: 'wrn_demo_4f9c2e7a1b8d3f60c5e9a2b7d4f1c8e3',
  PAYGRID_BASE_URL: 'https://paygrid.example.com',
  PAYGRID_V2_API_KEY: 'wrn_demo_4f9c2e7a1b8d3f60c5e9a2b7d4f1c8e3',
  PAYGRID_V2_BASE_URL: 'https://paygrid-v2.example.com',
  PAYGRID_V2_WEBHOOK_SECRET: 'example-v2-secret-for-tests',
  PAYMENTS_PROVIDER_V2: false,
  PROVIDER_WEBHOOK_SECRET: 'example-provider-secret-for-tests',
  WEBHOOK_SIGNING_SECRET: 'example-signing-secret-for-tests',
  LOG_LEVEL: 'silent',
};

export class FakeDb implements Db {
  payments: Record<string, any> = {};
  invoices: Record<string, any> = {};
  refunds: Record<string, any> = {};
  idempotency: Record<string, any> = {};
  merchant = {
    id: merchantId,
    name: 'Northbeam Outfitters',
    webhook_url: null,
    webhook_signing_secret: null,
    created_at: new Date(),
  };

  async query<T>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    const rows: any[] = [];
    if (text.startsWith('INSERT INTO payments')) {
      const [
        id,
        merchant_id,
        amount_cents,
        currency,
        status,
        provider_charge_id,
        customer_email,
      ] = params;
      const row = {
        id,
        merchant_id,
        amount_cents,
        captured_cents: 0,
        currency,
        status,
        provider_charge_id,
        provider_ref: provider_charge_id,
        customer_email,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.payments[String(id)] = row;
      rows.push(row);
    } else if (text.startsWith('SELECT * FROM payments WHERE id')) {
      const row = this.payments[String(params[0])];
      if (row?.merchant_id === params[1]) rows.push(row);
    } else if (text.startsWith('SELECT * FROM payments WHERE provider_ref')) {
      const row = Object.values(this.payments).find(
        (entry) =>
          entry.provider_ref === params[0] ||
          entry.provider_charge_id === params[0],
      );
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
      const row = {
        id,
        payment_id,
        merchant_id,
        amount_cents,
        reason,
        status: 'succeeded',
        created_at: new Date(),
      };
      this.refunds[String(id)] = row;
      rows.push(row);
    } else if (text.startsWith('SELECT * FROM refunds')) {
      rows.push(
        ...Object.values(this.refunds).filter(
          (row) =>
            row.payment_id === params[0] && row.merchant_id === params[1],
        ),
      );
    } else if (text.startsWith('INSERT INTO invoices')) {
      const [
        id,
        merchant_id,
        number,
        customer_name,
        customer_email,
        total_cents,
        line_items,
      ] = params;
      const row = {
        id,
        merchant_id,
        number,
        customer_name,
        customer_email,
        total_cents,
        line_items: JSON.parse(String(line_items)),
        status: 'open',
        created_at: new Date(),
      };
      this.invoices[String(id)] = row;
      rows.push(row);
    } else if (text.startsWith('SELECT * FROM invoices WHERE id')) {
      const row = this.invoices[String(params[0])];
      if (row && (params.length === 1 || row.merchant_id === params[1]))
        rows.push(row);
    } else if (text.startsWith('SELECT * FROM invoices')) {
      rows.push(
        ...Object.values(this.invoices).filter(
          (row) => row.merchant_id === params[0],
        ),
      );
    } else if (text.startsWith('SELECT * FROM merchants')) {
      if (params[0] === merchantId) rows.push(this.merchant);
    } else if (text.startsWith('UPDATE merchants')) {
      if (params[0] === merchantId) {
        this.merchant.name = String(params[1]);
        rows.push(this.merchant);
      }
    } else if (text.startsWith('SELECT * FROM idempotency_keys')) {
      const saved = this.idempotency[`${params[0]}:${params[1]}`];
      if (saved) rows.push(saved);
    } else if (text.startsWith('INSERT INTO idempotency_keys')) {
      const [merchant_id, key, request_hash, response] = params;
      this.idempotency[`${merchant_id}:${key}`] = {
        merchant_id,
        key,
        request_hash,
        response: JSON.parse(String(response)),
        created_at: new Date(),
      };
    } else if (!text.startsWith('INSERT INTO ledger_entries')) {
      throw new Error(`Unexpected SQL: ${text}`);
    }
    return { rows: rows as T[] };
  }
}
