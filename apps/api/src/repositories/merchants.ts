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
    const result = await this.db.query<MerchantRow>(
      'SELECT * FROM merchants WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }

  async updateProfile(id: string, name: string): Promise<MerchantRow | null> {
    const result = await this.db.query<MerchantRow>(
      'UPDATE merchants SET name = $2 WHERE id = $1 RETURNING *',
      [id, name],
    );
    return result.rows[0] ?? null;
  }

  async saveWebhook(
    merchantId: string,
    url: string,
  ): Promise<{ merchant_id: string; url: string; updated_at: Date }> {
    const result = await this.db.query<{
      merchant_id: string;
      url: string;
      updated_at: Date;
    }>(
      `INSERT INTO merchant_webhook_endpoints (merchant_id, url) VALUES ($1, $2)
       ON CONFLICT (merchant_id) DO UPDATE SET url = EXCLUDED.url, updated_at = NOW()
       RETURNING merchant_id, url, updated_at`,
      [merchantId, url],
    );
    return result.rows[0]!;
  }

  async findWebhook(
    merchantId: string,
  ): Promise<{ merchant_id: string; url: string; updated_at: Date } | null> {
    const result = await this.db.query<{
      merchant_id: string;
      url: string;
      updated_at: Date;
    }>(
      'SELECT merchant_id, url, updated_at FROM merchant_webhook_endpoints WHERE merchant_id = $1',
      [merchantId],
    );
    return result.rows[0] ?? null;
  }
}
