import { describe, expect, it, vi } from 'vitest';
import { ProviderV1Client } from '../src/providerV1/client.js';

describe('PayGrid client', () => {
  it('sends a charge with authentication', async () => {
    const fetcher = vi.fn(async (_url: URL, _init?: RequestInit) => new Response(JSON.stringify({ charge_id: 'ch_1', state: 'authorized', amount_cents: 500 }), { status: 200 }));
    const client = new ProviderV1Client({ baseUrl: 'https://paygrid.example.com', apiKey: 'demo', fetcher: fetcher as typeof fetch });
    const charge = await client.createCharge(500, { token: 'pm_demo_visa_4242' });
    expect(charge.charge_id).toBe('ch_1');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer demo' });
  });
});
