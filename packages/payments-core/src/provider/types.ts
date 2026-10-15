import type { Cents } from '@warren/money';

export type ProviderState = 'authorized' | 'captured' | 'failed';

export interface ProviderCharge {
  providerRef: string;
  amountCents: Cents;
  state: ProviderState;
  rawState: string;
}

export interface ProviderRefund {
  providerRef: string;
  state: 'succeeded' | 'failed';
}

export interface CreateChargeInput {
  amountCents: Cents;
  currency: string;
  paymentMethod: unknown;
  idempotencyKey?: string;
}

export interface CaptureInput {
  providerRef: string;
  amountCents: Cents;
  idempotencyKey?: string;
}

export interface RefundInput {
  providerRef: string;
  amountCents: Cents;
  idempotencyKey?: string;
}

export interface PaymentProvider {
  readonly name: 'paygrid-v1' | 'paygrid-v2';
  createCharge(input: CreateChargeInput): Promise<ProviderCharge>;
  capture(input: CaptureInput): Promise<ProviderCharge>;
  refund(input: RefundInput): Promise<ProviderRefund>;
}
