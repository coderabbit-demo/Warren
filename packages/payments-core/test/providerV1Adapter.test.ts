import { describe, expect, it, vi } from 'vitest';
import type { ProviderV1Client } from '../src/providerV1/client.js';
import { ProviderV1Adapter } from '../src/provider/ProviderV1Adapter.js';
import { cents } from '@warren/money';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/paygrid-v1-charge.json', import.meta.url), 'utf8')) as { charge_id: string; state: 'settled'; amount_cents: number };

describe('ProviderV1Adapter', () => {
  it('normalizes a charge response', async () => {
    const client = {
      createCharge: vi.fn(async () => fixture),
      capture: vi.fn(async () => fixture),
      refund: vi.fn(async () => ({ refund_id: 're_v1_demo', state: 'succeeded' })),
    } as unknown as ProviderV1Client;
    const adapter = new ProviderV1Adapter(client);
    const charge = await adapter.createCharge({ amountCents: cents(1250), currency: 'USD', paymentMethod: { token: 'pm_demo_visa_4242' } });
    expect(charge).toEqual({ providerRef: 'ch_v1_demo', amountCents: 1250, state: 'captured', rawState: 'settled' });
    const captured = await adapter.capture({ providerRef: 'ch_v1_demo', amountCents: cents(1250) });
    expect(captured.state).toBe('captured');
    const refund = await adapter.refund({ providerRef: 'ch_v1_demo', amountCents: cents(500) });
    expect(refund.providerRef).toBe('re_v1_demo');
  });
});
