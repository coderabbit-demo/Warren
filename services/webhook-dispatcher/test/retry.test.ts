import { describe, expect, it, vi } from 'vitest';
import { withRetry } from '../src/retry.js';

describe('delivery retry', () => {
  it('increases the wait after each failed attempt', async () => {
    const work = vi.fn().mockRejectedValueOnce(new Error('transient')).mockRejectedValueOnce(new Error('transient')).mockResolvedValue('delivered');
    const waits: number[] = [];
    const result = await withRetry(work, 3, 100, async (ms) => { waits.push(ms); });
    expect(result).toBe('delivered');
    expect(work).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([100, 200]);
  });
});
