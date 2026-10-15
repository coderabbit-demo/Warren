import { describe, expect, it, vi } from 'vitest';
import { Dispatcher } from '../src/dispatcher.js';
import { signPayload } from '../src/signing.js';

describe('webhook delivery', () => {
  it('signs and delivers an event', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    const delivered = vi.fn(async () => undefined);
    const store = { pending: async () => [{ id: 'evt', status: 'captured', paymentId: 'pay', merchantId: 'mer', webhookUrl: 'https://example.com/hook', signingSecret: 'secret' }], delivered };
    expect(await new Dispatcher(store, fetcher as typeof fetch, () => true).dispatchPending()).toBe(1);
    expect(delivered).toHaveBeenCalledWith('evt');
    expect(signPayload('payload', 'secret')).toMatch(/^[a-f0-9]{64}$/);
  });
});
