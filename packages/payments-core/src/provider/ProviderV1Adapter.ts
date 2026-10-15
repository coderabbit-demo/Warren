import { cents } from '@warren/money';
import type { ProviderV1Client } from '../providerV1/client.js';
import type { PayGridChargeResponse } from '../providerV1/types.js';
import type { CaptureInput, CreateChargeInput, PaymentProvider, ProviderCharge, ProviderRefund, RefundInput } from './types.js';

function mapCharge(response: PayGridChargeResponse): ProviderCharge {
  const state = response.state === 'settled' ? 'captured' : response.state;
  return {
    providerRef: response.charge_id,
    amountCents: cents(response.amount_cents),
    state,
    rawState: response.state,
  };
}

export class ProviderV1Adapter implements PaymentProvider {
  readonly name = 'paygrid-v1' as const;

  constructor(private readonly client: ProviderV1Client) {}

  async createCharge(input: CreateChargeInput): Promise<ProviderCharge> {
    const response = await this.client.createCharge(input.amountCents, input.paymentMethod);
    return mapCharge(response);
  }

  async capture(input: CaptureInput): Promise<ProviderCharge> {
    const response = await this.client.capture(input.providerRef, input.amountCents);
    return mapCharge(response);
  }

  async refund(input: RefundInput): Promise<ProviderRefund> {
    const response = await this.client.refund(input.providerRef, input.amountCents);
    return { providerRef: response.refund_id, state: response.state };
  }
}
