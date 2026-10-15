import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { PayGridV2Client } from '../src/providerV2/client.js';
import { PayGridV2Error } from '../src/providerV2/errors.js';

const authorized = readFileSync(new URL('./fixtures/paygrid-v2-authorized.json', import.meta.url), 'utf8');

function client(fetcher: typeof fetch, sleep = vi.fn(async (_ms: number) => undefined)) {
  return { service: new PayGridV2Client({ baseUrl: 'https://paygrid.example.com', apiKey: 'demo-key', fetcher, sleep }), sleep };
}

describe('PayGrid V2 client', () => {
  it('sends auth, JSON, and idempotency headers', async () => {
    const fetcher = vi.fn(async (_url: URL, _init?: RequestInit) => new Response(authorized, { status: 201 }));
    const { service } = client(fetcher as typeof fetch);
    const result = await service.createCharge({ amount: { amount: 1250, currency: 'USD' }, payment_method: { token: 'pm_demo_visa_4242' }, capture: false }, 'key-1');
    expect(result.reference).toBe('v2_charge_demo');
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe('https://paygrid.example.com/v2/charges');
    expect(init?.headers).toMatchObject({ authorization: 'Bearer demo-key', 'idempotency-key': 'key-1', 'content-type': 'application/json' });
    expect(JSON.parse(String(init?.body))).toMatchObject({ amount: { amount: 1250, currency: 'USD' }, capture: false });
    expect(init?.signal).toBeDefined();
  });

  it('retries a server error and then succeeds', async () => {
    const fetcher = vi.fn(async (_url: URL, _init?: RequestInit) => new Response(authorized, { status: 200 }));
    fetcher.mockImplementationOnce(async () => new Response(JSON.stringify({ error: { code: 'upstream_timeout', message: 'Try again' } }), { status: 503 }));
    const { service, sleep } = client(fetcher as typeof fetch);
    const charge = await service.capture('v2_charge_demo', { amount: { amount: 1250, currency: 'USD' } }, 'capture-key');
    expect(charge.state).toBe('authorized');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(100);
  });

  it('does not retry a client error', async () => {
    const fetcher = vi.fn(async (_url: URL, _init?: RequestInit) => new Response(JSON.stringify({ error: { code: 'invalid_amount', message: 'Amount rejected', request_id: 'req_demo' } }), { status: 422 }));
    const { service, sleep } = client(fetcher as typeof fetch);
    await expect(service.capture('v2_charge_demo', { amount: { amount: 0, currency: 'USD' } })).rejects.toMatchObject({ status: 422, code: 'invalid_amount', requestId: 'req_demo' });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('reports a repeated server error after the final attempt', async () => {
    const fetcher = vi.fn(async (_url: URL, _init?: RequestInit) => new Response(JSON.stringify({ error: { code: 'maintenance', message: 'Unavailable' } }), { status: 503 }));
    const { service, sleep } = client(fetcher as typeof fetch);
    await expect(service.refund('v2_charge_demo', { amount: { amount: 500, currency: 'USD' } })).rejects.toBeInstanceOf(PayGridV2Error);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
