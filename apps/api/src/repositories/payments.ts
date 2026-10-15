import type { Db } from '../db.js';
import type { Payment } from '@warren/payments-core';
import { cents } from '@warren/money';

export interface PaymentRow {
  id: string;
  merchant_id: string;
  amount_cents: number;
  captured_cents: number;
  currency: string;
  status: Payment['status'];
  provider_charge_id: string | null;
  customer_email: string;
  created_at: Date;
  updated_at: Date;
}

export function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    amountCents: cents(Number(row.amount_cents)),
    capturedCents: cents(Number(row.captured_cents)),
    currency: row.currency,
    status: row.status,
    providerChargeId: row.provider_charge_id,
    customerEmail: row.customer_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PaymentsRepository {
  constructor(private readonly db: Db) {}

  async create(input: { id: string; merchantId: string; amountCents: number; currency: string; providerChargeId: string; customerEmail: string }): Promise<Payment> {
    const result = await this.db.query<PaymentRow>(
      `INSERT INTO payments (id, merchant_id, amount_cents, currency, status, provider_charge_id, customer_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [input.id, input.merchantId, input.amountCents, input.currency, 'authorized', input.providerChargeId, input.customerEmail],
    );
    return mapPayment(result.rows[0]!);
  }

  async findByIdForMerchant(id: string, merchantId: string): Promise<Payment | null> {
    const result = await this.db.query<PaymentRow>('SELECT * FROM payments WHERE id = $1 AND merchant_id = $2', [id, merchantId]);
    return result.rows[0] ? mapPayment(result.rows[0]) : null;
  }

  async findByProviderChargeId(chargeId: string): Promise<Payment | null> {
    const result = await this.db.query<PaymentRow>('SELECT * FROM payments WHERE provider_charge_id = $1', [chargeId]);
    return result.rows[0] ? mapPayment(result.rows[0]) : null;
  }

  async setStatus(id: string, merchantId: string, status: Payment['status'], capturedCents: number): Promise<Payment> {
    const result = await this.db.query<PaymentRow>(
      'UPDATE payments SET status = $3, captured_cents = $4, updated_at = NOW() WHERE id = $1 AND merchant_id = $2 RETURNING *',
      [id, merchantId, status, capturedCents],
    );
    return mapPayment(result.rows[0]!);
  }
}
