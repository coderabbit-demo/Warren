import type { Cents } from '@warren/money';
import type { PaymentStatus } from './status.js';

export interface Payment {
  id: string;
  merchantId: string;
  amountCents: Cents;
  capturedCents: Cents;
  currency: string;
  status: PaymentStatus;
  providerChargeId: string | null;
  customerEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  id: string;
  paymentId: string;
  merchantId: string;
  amountCents: Cents;
  reason: string | null;
  status: 'pending' | 'succeeded' | 'failed';
  createdAt: Date;
}

export interface Charge {
  id: string;
  status: 'authorized' | 'settled' | 'failed';
  amountCents: Cents;
}
