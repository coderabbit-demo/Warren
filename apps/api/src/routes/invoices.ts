import { Router } from 'express';
import { z } from 'zod';
import type { RequestHandler } from 'express';
import type { InvoicesRepository, InvoiceRow } from '../repositories/invoices.js';
import type { InvoiceService } from '../services/invoiceService.js';
import { NotFoundError } from '../errors.js';

const invoiceSchema = z.object({
  number: z.string().min(1).max(40),
  customerName: z.string().min(1),
  customerEmail: z.email(),
  lineItems: z.array(z.object({ description: z.string(), quantity: z.number().int().positive(), unitAmountCents: z.number().int().nonnegative() })).min(1),
});

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function toCsv(invoice: InvoiceRow): string {
  const rows = [['number', 'customer_name', 'customer_email', 'description', 'quantity', 'unit_amount_cents']];
  for (const item of invoice.line_items) {
    rows.push([invoice.number, invoice.customer_name, invoice.customer_email, item.description, String(item.quantity), String(item.unitAmountCents)]);
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

export function invoicesRouter(service: InvoiceService, invoices: InvoicesRepository, requireAuth: RequestHandler) {
  const router = Router();
  router.post('/invoices', requireAuth, async (req, res) => {
    const body = invoiceSchema.parse(req.body);
    res.status(201).json(await service.create(req.auth.merchantId, body));
  });
  router.get('/invoices', requireAuth, async (req, res) => {
    res.json(await invoices.listForMerchant(req.auth.merchantId));
  });
  router.get('/invoices/:id/export', requireAuth, async (req, res) => {
    const invoice = await invoices.findById(String(req.params.id));
    if (!invoice) throw new NotFoundError('invoice');
    res.type('text/csv').attachment(`${invoice.number}.csv`).send(toCsv(invoice));
  });
  router.get('/invoices/:id', requireAuth, async (req, res) => {
    const invoice = await invoices.findByIdForMerchant(String(req.params.id), req.auth.merchantId);
    if (!invoice) throw new NotFoundError('invoice');
    res.json(invoice);
  });
  return router;
}
