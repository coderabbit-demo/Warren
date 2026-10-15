export const PaymentStatus = {
  Pending: 'pending',
  Authorized: 'authorized',
  Settled: 'settled',
  Refunded: 'refunded',
  Failed: 'failed',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
