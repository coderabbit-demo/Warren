import { randomUUID } from 'node:crypto';
import { signPayload } from '@warren/webhook-dispatcher';

export interface TestDeliveryResult {
  status: number;
  body: string;
}

export class WebhookTester {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async send(url: string, merchantId: string): Promise<TestDeliveryResult> {
    const payload = {
      id: randomUUID(),
      type: 'webhook.test',
      data: { merchantId },
    };
    const body = JSON.stringify(payload);
    const headers = {
      'content-type': 'application/json',
      'x-warren-signature': signPayload(body),
    };
    const res = await this.fetcher(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    return { status: res.status, body: (await res.text()).slice(0, 2000) };
  }
}
