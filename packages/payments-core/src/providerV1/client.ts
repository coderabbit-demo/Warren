import type { PayGridChargeResponse, PayGridRefundResponse } from './types.js';

export interface ProviderV1Options {
  baseUrl: string;
  apiKey: string;
  fetcher?: typeof fetch;
}

export class ProviderV1Client {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: ProviderV1Options) {
    this.fetcher = options.fetcher ?? fetch;
  }

  private async request<T>(path: string, body: object): Promise<T> {
    const response = await this.fetcher(new URL(path, this.options.baseUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`PayGrid request failed: ${response.status}`);
    return (await response.json()) as T;
  }

  createCharge(amountCents: number, paymentMethod: unknown): Promise<PayGridChargeResponse> {
    return this.request('/v1/charges', { amount_cents: amountCents, payment_method: paymentMethod });
  }

  capture(chargeId: string, amountCents: number): Promise<PayGridChargeResponse> {
    return this.request(`/v1/charges/${encodeURIComponent(chargeId)}/capture`, { amount_cents: amountCents });
  }

  refund(chargeId: string, amountCents: number): Promise<PayGridRefundResponse> {
    return this.request(`/v1/charges/${encodeURIComponent(chargeId)}/refunds`, { amount_cents: amountCents });
  }
}
