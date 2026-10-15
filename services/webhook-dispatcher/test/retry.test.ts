import { describe, expect, it, vi } from 'vitest';
import { withRetry } from '../src/retry.js';

describe('delivery retry', () => {
  it('spreads exponential waits with jitter', async () => {
    const work = vi.fn().mockRejectedValueOnce(new Error('transient')).mockRejectedValueOnce(new Error('transient')).mockResolvedValue('delivered');
    const waits: number[] = [];
    const result = await withRetry(work, 3, 100, async (ms) => { waits.push(ms); }, () => 0.25);
    expect(result).toBe('delivered');
    expect(waits).toEqual([75, 150]);
    expect(work).toHaveBeenCalledTimes(3);
  });
});
