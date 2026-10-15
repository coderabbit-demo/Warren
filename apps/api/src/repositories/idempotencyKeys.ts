import type { Db } from '../db.js';

export interface IdempotencyRecord {
  key: string;
  merchant_id: string;
  request_hash: string;
  response: { status: number; body: unknown };
  created_at: Date;
}

export class IdempotencyKeysRepository {
  constructor(private readonly db: Db) {}

  async find(merchantId: string, key: string): Promise<IdempotencyRecord | null> {
    const result = await this.db.query<IdempotencyRecord>('SELECT * FROM idempotency_keys WHERE merchant_id = $1 AND key = $2', [merchantId, key]);
    return result.rows[0] ?? null;
  }

  async save(merchantId: string, key: string, requestHash: string, response: IdempotencyRecord['response']): Promise<void> {
    await this.db.query(
      'INSERT INTO idempotency_keys (merchant_id, key, request_hash, response) VALUES ($1, $2, $3, $4)',
      [merchantId, key, requestHash, JSON.stringify(response)],
    );
  }
}
