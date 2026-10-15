import { randomUUID } from 'node:crypto';
import { cents } from '@warren/money';
import type { InvoicesRepository, InvoiceRow } from '../repositories/invoices.js';

export class InvoiceService {
  constructor(private readonly invoices: InvoicesRepository) {}

  async create(merchantId: string, input: { number: string; customerName: string; customerEmail: string; lineItems: InvoiceRow['line_items'] }): Promise<InvoiceRow> {
    const totalCents = cents(input.lineItems.reduce((total, item) => total + item.quantity * item.unitAmountCents, 0));
    return this.invoices.create({ id: randomUUID(), merchantId, ...input, totalCents });
  }
}
