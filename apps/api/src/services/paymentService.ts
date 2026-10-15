import { randomUUID } from 'node:crypto';
import { PaymentStatus, type Payment } from '@warren/payments-core';
import type { ProviderV1Client } from '@warren/payments-core';
import type { Ledger } from '@warren/ledger';
import { NotFoundError, DomainError } from '../errors.js';
import type { PaymentsRepository } from '../repositories/payments.js';

export class PaymentService {
  constructor(private readonly payments: PaymentsRepository, private readonly provider: ProviderV1Client, private readonly ledger: Ledger) {}

  async create(merchantId: string, input: { amountCents: number; currency: string; customerEmail: string; paymentMethod: unknown }): Promise<Payment> {
    const charge = await this.provider.createCharge(input.amountCents, input.paymentMethod);
    const payment = await this.payments.create({
      id: randomUUID(),
      merchantId,
      amountCents: input.amountCents,
      currency: input.currency,
      providerChargeId: charge.charge_id,
      customerEmail: input.customerEmail,
    });
    await this.ledger.recordStatusChange(payment.id, merchantId, payment.status, payment.amountCents);
    return payment;
  }

  async capture(merchantId: string, paymentId: string): Promise<Payment> {
    const payment = await this.payments.findByIdForMerchant(paymentId, merchantId);
    if (!payment) throw new NotFoundError('payment');
    if (payment.status !== PaymentStatus.Authorized || !payment.providerChargeId) {
      throw new DomainError('Payment is not authorized', 409, 'invalid_payment_state');
    }
    await this.provider.capture(payment.providerChargeId, payment.amountCents);
    const captured = await this.payments.setStatus(payment.id, merchantId, PaymentStatus.Captured, payment.amountCents);
    await this.ledger.recordStatusChange(payment.id, merchantId, PaymentStatus.Captured, payment.amountCents);
    return captured;
  }

  async recordProviderStatus(chargeId: string, status: Payment['status']): Promise<void> {
    const payment = await this.payments.findByProviderChargeId(chargeId);
    if (!payment || payment.status === status) return;
    const capturedCents = status === PaymentStatus.Captured ? payment.amountCents : payment.capturedCents;
    await this.payments.setStatus(payment.id, payment.merchantId, status, capturedCents);
    await this.ledger.recordStatusChange(payment.id, payment.merchantId, status, capturedCents);
  }
}
