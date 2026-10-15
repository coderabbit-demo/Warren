export interface PayGridChargeResponse {
  charge_id: string;
  state: 'authorized' | 'settled' | 'failed';
  amount_cents: number;
}

export interface PayGridRefundResponse {
  refund_id: string;
  state: 'succeeded' | 'failed';
}
