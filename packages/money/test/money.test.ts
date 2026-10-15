import { describe, expect, it } from 'vitest';
import { add, cents, formatUsdCents, parseDecimalCents, subtract } from '../src/index.js';

describe('money', () => {
  it('keeps amounts in integer cents', () => {
    expect(add(cents(125), cents(75))).toBe(200);
    expect(subtract(cents(125), cents(75))).toBe(50);
    expect(formatUsdCents(cents(-1205))).toBe('-$12.05');
    expect(parseDecimalCents('12.05')).toBe(1205);
  });
  it('rejects imprecise amounts', () => {
    expect(() => cents(0.5)).toThrow();
    expect(() => parseDecimalCents('1.005')).toThrow();
  });
});
