export type V2ChargeState = 'created' | 'authorized' | 'captured' | 'declined';
export type V2RefundState = 'queued' | 'succeeded' | 'failed';

export interface V2Money {
  amount: number;
  currency: string;
}

export interface V2Charge {
  id: string;
  reference: string;
  state: V2ChargeState;
  authorized: V2Money;
  captured: V2Money;
  created_at: string;
  updated_at: string;
}

export interface V2Refund {
  id: string;
  charge_reference: string;
  amount: V2Money;
  state: V2RefundState;
  created_at: string;
}

export interface V2CreateChargeRequest {
  amount: V2Money;
  payment_method: unknown;
  capture: false;
}

export interface V2CaptureRequest {
  amount: V2Money;
}

export interface V2RefundRequest {
  amount: V2Money;
}

export interface V2ErrorResponse {
  error: {
    code: string;
    message: string;
    request_id?: string;
  };
}

export interface V2WebhookEvent {
  id: string;
  type: 'charge.authorized' | 'charge.captured' | 'charge.declined' | 'refund.succeeded';
  data: {
    charge_reference: string;
    amount: V2Money;
  };
  created_at: string;
}
