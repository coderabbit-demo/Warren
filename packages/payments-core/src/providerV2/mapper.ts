import { cents } from '@warren/money';
import type { ProviderCharge, ProviderRefund } from '../provider/types.js';
import type { V2Charge, V2Refund, V2WebhookEvent } from './types.js';
import { PayGridV2ProtocolError } from './errors.js';

export function mapV2Charge(charge: V2Charge): ProviderCharge {
  const state = charge.state === 'captured' ? 'captured' : charge.state === 'declined' ? 'failed' : 'authorized';
  const amount = charge.state === 'captured' ? charge.captured.amount : charge.authorized.amount;
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new PayGridV2ProtocolError('PayGrid V2 returned an invalid amount');
  }
  return {
    providerRef: charge.reference,
    state,
    rawState: charge.state,
    amountCents: cents(amount),
  };
}

export function mapV2Refund(refund: V2Refund): ProviderRefund {
  return {
    providerRef: refund.id,
    state: refund.state === 'failed' ? 'failed' : 'succeeded',
  };
}

export function mapV2Webhook(event: V2WebhookEvent): { chargeId: string; status: 'authorized' | 'captured' | 'failed' } | null {
  switch (event.type) {
    case 'charge.authorized':
      return { chargeId: event.data.charge_reference, status: 'authorized' };
    case 'charge.captured':
      return { chargeId: event.data.charge_reference, status: 'captured' };
    case 'charge.declined':
      return { chargeId: event.data.charge_reference, status: 'failed' };
    case 'refund.succeeded':
      return null;
  }
}
