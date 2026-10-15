import { randomUUID } from 'node:crypto';
import { PaymentStatus, type Refund } from '@warren/payments-core';
import type { PaymentProvider } from '@warren/payments-core';
import type { Ledger } from '@warren/ledger';
import { NotFoundError, DomainError } from '../errors.js';
import type { PaymentsRepository } from '../repositories/payments.js';
import type { RefundsRepository } from '../repositories/refunds.js';

export class RefundService {
  constructor(
    private readonly payments: PaymentsRepository,
    private readonly refunds: RefundsRepository,
    private readonly provider: PaymentProvider,
    private readonly ledger: Ledger,
  ) {}

  async createFullRefund(
    merchantId: string,
    paymentId: string,
    reason?: string,
    idempotencyKey?: string,
  ): Promise<Refund> {
    const payment = await this.payments.findByIdForMerchant(
      paymentId,
      merchantId,
    );
    if (!payment) throw new NotFoundError('payment');
    if (
      payment.status !== PaymentStatus.Captured ||
      !payment.providerChargeId
    ) {
      throw new DomainError(
        'Payment is not captured',
        409,
        'invalid_payment_state',
      );
    }
    const result = await this.provider.refund({
      providerRef: payment.providerChargeId,
      amountCents: payment.capturedCents,
      idempotencyKey,
    });
    if (result.state !== 'succeeded') {
      throw new DomainError(
        'Provider did not complete the refund',
        502,
        'provider_refund_failed',
      );
    }
    const refund = await this.refunds.create({
      id: randomUUID(),
      paymentId,
      merchantId,
      amountCents: payment.capturedCents,
      reason,
    });
    await this.payments.setStatus(
      paymentId,
      merchantId,
      PaymentStatus.Refunded,
      payment.capturedCents,
    );
    await this.ledger.recordStatusChange(
      paymentId,
      merchantId,
      PaymentStatus.Refunded,
      payment.capturedCents,
    );
    return refund;
  }
}
