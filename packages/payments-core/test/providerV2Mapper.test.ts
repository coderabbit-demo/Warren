import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  mapV2Charge,
  mapV2Refund,
  mapV2Webhook,
} from '../src/providerV2/mapper.js';
import type {
  V2Charge,
  V2Refund,
  V2WebhookEvent,
} from '../src/providerV2/types.js';

function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'),
  ) as T;
}

describe('PayGrid V2 mapping', () => {
  it('maps authorized and captured charges', () => {
    const authorized = mapV2Charge(
      fixture<V2Charge>('paygrid-v2-authorized.json'),
    );
    const captured = mapV2Charge(fixture<V2Charge>('paygrid-v2-captured.json'));
    expect(authorized).toMatchObject({
      providerRef: 'v2_charge_demo',
      state: 'authorized',
      amountCents: 1250,
    });
    expect(captured).toMatchObject({
      providerRef: 'v2_charge_demo',
      state: 'captured',
      amountCents: 1250,
    });
  });

  it('maps refunds', () => {
    expect(mapV2Refund(fixture<V2Refund>('paygrid-v2-refund.json'))).toEqual({
      providerRef: 'v2_refund_demo',
      state: 'succeeded',
    });
  });

  it('maps incoming charge events', () => {
    const event: V2WebhookEvent = {
      id: 'evt_demo',
      type: 'charge.captured',
      data: {
        charge_reference: 'v2_charge_demo',
        amount: { amount: 1250, currency: 'USD' },
      },
      created_at: '2026-10-15T12:05:00Z',
    };
    expect(mapV2Webhook(event)).toEqual({
      chargeId: 'v2_charge_demo',
      status: 'captured',
    });
    expect(mapV2Webhook({ ...event, type: 'refund.succeeded' })).toBeNull();
  });
});
