import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { cents } from '@warren/money';
import { ProviderV2Adapter } from '../src/providerV2/adapter.js';
import type { PayGridV2Client } from '../src/providerV2/client.js';
import type { V2Charge, V2Refund } from '../src/providerV2/types.js';

function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')) as T;
}

describe('ProviderV2Adapter', () => {
  it('translates charge and capture operations', async () => {
    const client = {
      createCharge: vi.fn(async () => fixture<V2Charge>('paygrid-v2-authorized.json')),
      capture: vi.fn(async () => fixture<V2Charge>('paygrid-v2-captured.json')),
      refund: vi.fn(async () => fixture<V2Refund>('paygrid-v2-refund.json')),
    } as unknown as PayGridV2Client;
    const adapter = new ProviderV2Adapter(client);
    const created = await adapter.createCharge({ amountCents: cents(1250), currency: 'USD', paymentMethod: { token: 'pm_demo_visa_4242' }, idempotencyKey: 'create-key' });
    expect(created.state).toBe('authorized');
    const captured = await adapter.capture({ providerRef: created.providerRef, amountCents: cents(1250), idempotencyKey: 'capture-key' });
    expect(captured.state).toBe('captured');
    const refunded = await adapter.refund({ providerRef: captured.providerRef, amountCents: cents(500), idempotencyKey: 'refund-key' });
    expect(refunded).toEqual({ providerRef: 'v2_refund_demo', state: 'succeeded' });
  });
});
