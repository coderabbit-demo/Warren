import { describe, expect, it, vi } from 'vitest';
import { PaymentStatus } from '@warren/payments-core';
import { Ledger } from '../src/ledger.js';

describe('ledger', () => {
  it('records status changes', async () => {
    const query = vi.fn(async (_text: string, _params?: unknown[]) => ({ rows: [] }));
    await new Ledger({ query }).recordStatusChange('payment', 'merchant', PaymentStatus.Settled, 250);
    expect(query.mock.calls[0]?.[1]?.slice(1)).toEqual(['payment', 'merchant', 'settled', 250]);
  });

  it('uses a stable timestamp for a new entry', async () => {
    const instant = new Date('2026-10-15T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(instant);
    try {
      const query = vi.fn(async (_text: string, _params?: unknown[]) => ({ rows: [] }));
      await new Ledger({ query }).recordStatusChange('payment', 'merchant', PaymentStatus.Settled, 250);
      expect(query.mock.calls[0]?.[1]?.[5]).toEqual(instant);
    } finally {
      vi.useRealTimers();
    }
  });
});
