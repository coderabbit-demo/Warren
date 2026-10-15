import express from 'express';
import type { Db } from './db.js';
import type { Config } from './config.js';
import { ProviderV1Client } from '@warren/payments-core';
import { Ledger } from '@warren/ledger';
import { PaymentsRepository } from './repositories/payments.js';
import { RefundsRepository } from './repositories/refunds.js';
import { InvoicesRepository } from './repositories/invoices.js';
import { MerchantsRepository } from './repositories/merchants.js';
import { IdempotencyKeysRepository } from './repositories/idempotencyKeys.js';
import { PaymentService } from './services/paymentService.js';
import { RefundService } from './services/refundService.js';
import { InvoiceService } from './services/invoiceService.js';
import { makeRequireAuth } from './middleware/auth.js';
import { makeWithIdempotency } from './middleware/idempotency.js';
import { errorHandler } from './middleware/errorHandler.js';
import { providerWebhooksRouter } from './routes/providerWebhooks.js';
import { paymentsRouter } from './routes/payments.js';
import { refundsRouter } from './routes/refunds.js';
import { invoicesRouter } from './routes/invoices.js';
import { merchantsRouter } from './routes/merchants.js';

export interface AppDependencies {
  db: Db;
  config: Config;
  provider?: ProviderV1Client;
}

export function createApp({ db, config, provider = new ProviderV1Client({ baseUrl: config.PAYGRID_BASE_URL, apiKey: config.PAYGRID_API_KEY }) }: AppDependencies) {
  const app = express();
  const payments = new PaymentsRepository(db);
  const refunds = new RefundsRepository(db);
  const invoices = new InvoicesRepository(db);
  const merchants = new MerchantsRepository(db);
  const ledger = new Ledger(db);
  const paymentService = new PaymentService(payments, provider, ledger);
  const refundService = new RefundService(payments, refunds, provider, ledger);
  const invoiceService = new InvoiceService(invoices);
  const requireAuth = makeRequireAuth(config);
  const withIdempotency = makeWithIdempotency(new IdempotencyKeysRepository(db));

  app.use(providerWebhooksRouter(paymentService, config));
  app.use(express.json({ limit: '64kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(paymentsRouter(paymentService, payments, requireAuth, withIdempotency));
  app.use(refundsRouter(refundService, refunds, requireAuth, withIdempotency));
  app.use(invoicesRouter(invoiceService, invoices, requireAuth));
  app.use(merchantsRouter(merchants, requireAuth));
  app.use(errorHandler);
  return app;
}
