export const PaymentStatus = {
  Pending: 'pending',
  Authorized: 'authorized',
  Settled: 'settled',
  PartiallyRefunded: 'partially_refunded',
  Refunded: 'refunded',
  Failed: 'failed',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
