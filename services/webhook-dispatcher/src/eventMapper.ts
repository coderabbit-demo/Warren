import { PaymentStatus } from '@warren/payments-core';

const NOTIFY_STATUSES = new Set<string>(['settled', 'refunded', 'failed']);

export function shouldNotify(row: { status: string }): boolean {
  return NOTIFY_STATUSES.has(row.status);
}

export function toEventType(status: string): string {
  switch (status) {
    case PaymentStatus.Captured: return 'payment.captured';
    case PaymentStatus.Authorized: return 'payment.authorized';
    case PaymentStatus.Refunded: return 'payment.refunded';
    case PaymentStatus.Failed: return 'payment.failed';
    default: throw new Error(`No event type for status ${status}`);
  }
}
