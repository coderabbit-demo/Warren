import { randomUUID } from 'node:crypto';
import type { PaymentStatusType } from '@warren/payments-core';

export interface LedgerDb {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export class Ledger {
  constructor(private readonly db: LedgerDb) {}

  async recordStatusChange(paymentId: string, merchantId: string, status: PaymentStatusType, amountCents: number): Promise<void> {
    await this.db.query(
      'INSERT INTO ledger_entries (id, payment_id, merchant_id, kind, amount_cents, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [randomUUID(), paymentId, merchantId, status, amountCents],
    );
  }
}
