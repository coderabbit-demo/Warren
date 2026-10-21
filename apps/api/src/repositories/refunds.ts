import { cents } from '@warren/money';
import type { Refund } from '@warren/payments-core';
import type { Db } from '../db.js';

interface RefundRow {
  id: string;
  payment_id: string;
  merchant_id: string;
  amount_cents: number;
  reason: string | null;
  status: Refund['status'];
  created_at: Date;
}

function mapRefund(row: RefundRow): Refund {
  return {
    id: row.id,
    paymentId: row.payment_id,
    merchantId: row.merchant_id,
    amountCents: cents(Number(row.amount_cents)),
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  };
}

export class RefundsRepository {
  constructor(private readonly db: Db) {}

  async create(input: {
    id: string;
    paymentId: string;
    merchantId: string;
    amountCents: number;
    reason?: string;
  }): Promise<Refund> {
    const result = await this.db.query<RefundRow>(
      `INSERT INTO refunds (id, payment_id, merchant_id, amount_cents, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'succeeded') RETURNING *`,
      [
        input.id,
        input.paymentId,
        input.merchantId,
        input.amountCents,
        input.reason ?? null,
      ],
    );
    return mapRefund(result.rows[0]!);
  }

  async listForPayment(
    paymentId: string,
    merchantId: string,
  ): Promise<Refund[]> {
    const result = await this.db.query<RefundRow>(
      'SELECT * FROM refunds WHERE payment_id = $1 AND merchant_id = $2 ORDER BY created_at DESC',
      [paymentId, merchantId],
    );
    return result.rows.map(mapRefund);
  }

  async sumForPayment(paymentId: string): Promise<number> {
    const result = await this.db.query<{ total_cents: number }>(
      'SELECT COALESCE(SUM(amount_cents), 0) AS total_cents FROM refunds WHERE payment_id = $1 AND status = $2',
      [paymentId, 'succeeded'],
    );
    return Number(result.rows[0]?.total_cents ?? 0);
  }
}
