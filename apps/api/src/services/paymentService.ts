import { randomUUID } from 'node:crypto';
import { PaymentStatus, type Payment } from '@warren/payments-core';
import type { PaymentProvider } from '@warren/payments-core';
import {
  ProviderV1Adapter,
  ProviderV1Client,
  ProviderV2Adapter,
  PayGridV2Client,
} from '@warren/payments-core';
import { cents } from '@warren/money';
import type { Ledger } from '@warren/ledger';
import type { Config } from '../config.js';
import { NotFoundError, DomainError } from '../errors.js';
import type { PaymentsRepository } from '../repositories/payments.js';

export class PaymentService {
  constructor(
    private readonly payments: PaymentsRepository,
    private readonly provider: PaymentProvider,
    private readonly ledger: Ledger,
  ) {}

  async create(
    merchantId: string,
    input: {
      amountCents: number;
      currency: string;
      customerEmail: string;
      paymentMethod: unknown;
      idempotencyKey?: string;
    },
  ): Promise<Payment> {
    const charge = await this.provider.createCharge({
      amountCents: cents(input.amountCents),
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      idempotencyKey: input.idempotencyKey,
    });
    const status =
      charge.state === 'failed'
        ? PaymentStatus.Failed
        : charge.state === 'captured'
          ? PaymentStatus.Captured
          : PaymentStatus.Authorized;
    const payment = await this.payments.create({
      id: randomUUID(),
      merchantId,
      amountCents: input.amountCents,
      currency: input.currency,
      status,
      providerChargeId: charge.providerRef,
      customerEmail: input.customerEmail,
    });
    await this.ledger.recordStatusChange(
      payment.id,
      merchantId,
      payment.status,
      payment.amountCents,
    );
    return payment;
  }

  async capture(
    merchantId: string,
    paymentId: string,
    idempotencyKey?: string,
  ): Promise<Payment> {
    const payment = await this.payments.findByIdForMerchant(
      paymentId,
      merchantId,
    );
    if (!payment) throw new NotFoundError('payment');
    if (
      payment.status !== PaymentStatus.Authorized ||
      !payment.providerChargeId
    ) {
      throw new DomainError(
        'Payment is not authorized',
        409,
        'invalid_payment_state',
      );
    }
    const result = await this.provider.capture({
      providerRef: payment.providerChargeId,
      amountCents: payment.amountCents,
      idempotencyKey,
    });
    if (result.state !== 'captured') {
      throw new DomainError(
        'Provider did not capture the payment',
        502,
        'provider_capture_failed',
      );
    }
    const captured = await this.payments.setStatus(
      payment.id,
      merchantId,
      PaymentStatus.Captured,
      payment.amountCents,
    );
    await this.ledger.recordStatusChange(
      payment.id,
      merchantId,
      PaymentStatus.Captured,
      payment.amountCents,
    );
    return captured;
  }

  async recordProviderStatus(
    chargeId: string,
    status: Payment['status'],
  ): Promise<void> {
    const payment = await this.payments.findByProviderChargeId(chargeId);
    if (!payment || payment.status === status) return;
    const capturedCents =
      status === PaymentStatus.Captured
        ? payment.amountCents
        : payment.capturedCents;
    await this.payments.setStatus(
      payment.id,
      payment.merchantId,
      status,
      capturedCents,
    );
    await this.ledger.recordStatusChange(
      payment.id,
      payment.merchantId,
      status,
      capturedCents,
    );
  }
}

export function selectPaymentProvider(
  config: Config,
  fetcher: typeof fetch = fetch,
): PaymentProvider {
  if (config.PAYMENTS_PROVIDER_V2) {
    return new ProviderV2Adapter(
      new PayGridV2Client({
        baseUrl: config.PAYGRID_V2_BASE_URL!,
        apiKey: config.PAYGRID_V2_API_KEY!,
        fetcher,
      }),
    );
  }
  return new ProviderV1Adapter(
    new ProviderV1Client({
      baseUrl: config.PAYGRID_BASE_URL,
      apiKey: config.PAYGRID_API_KEY,
      fetcher,
    }),
  );
}
