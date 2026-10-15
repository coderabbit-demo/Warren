import type { Db } from '../db.js';

export interface InvoiceRow {
  id: string;
  merchant_id: string;
  number: string;
  customer_name: string;
  customer_email: string;
  total_cents: number;
  status: string;
  line_items: Array<{ description: string; quantity: number; unitAmountCents: number }>;
  created_at: Date;
}

export class InvoicesRepository {
  constructor(private readonly db: Db) {}

  async create(input: { id: string; merchantId: string; number: string; customerName: string; customerEmail: string; totalCents: number; lineItems: InvoiceRow['line_items'] }): Promise<InvoiceRow> {
    const result = await this.db.query<InvoiceRow>(
      `INSERT INTO invoices (id, merchant_id, number, customer_name, customer_email, total_cents, status, line_items)
       VALUES ($1, $2, $3, $4, $5, $6, 'open', $7) RETURNING *`,
      [input.id, input.merchantId, input.number, input.customerName, input.customerEmail, input.totalCents, JSON.stringify(input.lineItems)],
    );
    return result.rows[0]!;
  }

  async listForMerchant(merchantId: string): Promise<InvoiceRow[]> {
    const result = await this.db.query<InvoiceRow>('SELECT * FROM invoices WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT 100', [merchantId]);
    return result.rows;
  }

  async findByIdForMerchant(id: string, merchantId: string): Promise<InvoiceRow | null> {
    const result = await this.db.query<InvoiceRow>('SELECT * FROM invoices WHERE id = $1 AND merchant_id = $2', [id, merchantId]);
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<InvoiceRow | null> {
    const result = await this.db.query<InvoiceRow>('SELECT * FROM invoices WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }
}
