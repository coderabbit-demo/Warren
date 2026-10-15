import { describe, expect, it, vi } from 'vitest';
import { PaymentStatus } from '@warren/payments-core';
import { Ledger } from '../src/ledger.js';

describe('ledger', () => {
  it('records status changes', async () => {
    const query = vi.fn(async (_text: string, _params?: unknown[]) => ({
      rows: [],
    }));
    await new Ledger({ query }).recordStatusChange(
      'payment',
      'merchant',
      PaymentStatus.Captured,
      250,
    );
    expect(query.mock.calls[0]?.[1]?.slice(1)).toEqual([
      'payment',
      'merchant',
      'captured',
      250,
    ]);
  });
});
