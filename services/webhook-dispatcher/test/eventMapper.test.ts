import { describe, expect, it } from 'vitest';
import { toEventType } from '../src/eventMapper.js';

describe('merchant event mapping', () => {
  it('uses captured terminology', () => {
    expect(toEventType('captured')).toBe('payment.captured');
    expect(toEventType('authorized')).toBe('payment.authorized');
  });

  it('retains refund and failure events', () => {
    expect(toEventType('refunded')).toBe('payment.refunded');
    expect(toEventType('failed')).toBe('payment.failed');
  });
});
