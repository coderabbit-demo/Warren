import { randomUUID } from 'node:crypto';
import { PaymentStatus, type Refund } from '@warren/payments-core';
import type { ProviderV1Client } from '@warren/payments-core';
import type { Ledger } from '@warren/ledger';
import { NotFoundError, DomainError } from '../errors.js';
import type { PaymentsRepository } from '../repositories/payments.js';
import type { RefundsRepository } from '../repositories/refunds.js';

export class RefundService {
  constructor(private readonly payments: PaymentsRepository, private readonly refunds: RefundsRepository, private readonly provider: ProviderV1Client, private readonly ledger: Ledger) {}

  async createFullRefund(merchantId: string, paymentId: string, reason?: string): Promise<Refund> {
    const payment = await this.payments.findByIdForMerchant(paymentId, merchantId);
    if (!payment) throw new NotFoundError('payment');
    if (payment.status !== PaymentStatus.Captured || !payment.providerChargeId) {
      throw new DomainError('Payment is not captured', 409, 'invalid_payment_state');
    }
    await this.provider.refund(payment.providerChargeId, payment.capturedCents);
    const refund = await this.refunds.create({ id: randomUUID(), paymentId, merchantId, amountCents: payment.capturedCents, reason });
    await this.payments.setStatus(paymentId, merchantId, PaymentStatus.Refunded, payment.capturedCents);
    await this.ledger.recordStatusChange(paymentId, merchantId, PaymentStatus.Refunded, payment.capturedCents);
    return refund;
  }
}
