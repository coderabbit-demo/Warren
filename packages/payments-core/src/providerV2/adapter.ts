import type {
  PaymentProvider,
  ProviderCharge,
  ProviderRefund,
  CreateChargeInput,
  CaptureInput,
  RefundInput,
} from '../provider/types.js';
import { mapV2Charge, mapV2Refund } from './mapper.js';
import type { PayGridV2Client } from './client.js';

export class ProviderV2Adapter implements PaymentProvider {
  readonly name = 'paygrid-v2' as const;

  constructor(private readonly client: PayGridV2Client) {}

  async createCharge(input: CreateChargeInput): Promise<ProviderCharge> {
    const charge = await this.client.createCharge(
      {
        amount: { amount: input.amountCents, currency: input.currency },
        payment_method: input.paymentMethod,
        capture: false,
      },
      input.idempotencyKey,
    );
    return mapV2Charge(charge);
  }

  async capture(input: CaptureInput): Promise<ProviderCharge> {
    const charge = await this.client.capture(
      input.providerRef,
      { amount: { amount: input.amountCents, currency: 'USD' } },
      input.idempotencyKey,
    );
    return mapV2Charge(charge);
  }

  async refund(input: RefundInput): Promise<ProviderRefund> {
    const refund = await this.client.refund(
      input.providerRef,
      { amount: { amount: input.amountCents, currency: 'USD' } },
      input.idempotencyKey,
    );
    return mapV2Refund(refund);
  }
}
