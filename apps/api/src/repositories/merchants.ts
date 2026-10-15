import type { Db } from '../db.js';

export interface MerchantRow {
  id: string;
  name: string;
  webhook_url: string | null;
  webhook_signing_secret: string | null;
  created_at: Date;
}

export class MerchantsRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<MerchantRow | null> {
    const result = await this.db.query<MerchantRow>('SELECT * FROM merchants WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async updateProfile(id: string, name: string): Promise<MerchantRow | null> {
    const result = await this.db.query<MerchantRow>('UPDATE merchants SET name = $2 WHERE id = $1 RETURNING *', [id, name]);
    return result.rows[0] ?? null;
  }
}
