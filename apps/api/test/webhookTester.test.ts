import { describe, expect, it, vi } from 'vitest';
import { WebhookTester } from '../src/services/webhookTester.js';

describe('webhook test delivery', () => {
  it('sends a signed ping and returns the response summary', async () => {
    const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => new Response('pong', { status: 200 }));
    const tester = new WebhookTester(fetcher as typeof fetch);
    const result = await tester.send('https://merchant.example.com/hook', 'merchant-1');
    expect(result).toEqual({ status: 200, body: 'pong' });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://merchant.example.com/hook');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'content-type': 'application/json' });
    expect((init?.headers as Record<string, string>)['x-warren-signature']).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.parse(String(init?.body))).toMatchObject({ type: 'webhook.test', data: { merchantId: 'merchant-1' } });
  });
});
