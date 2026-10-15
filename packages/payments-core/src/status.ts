export const PaymentStatus = {
  Pending: 'pending',
  Authorized: 'authorized',
  Captured: 'captured',
  Refunded: 'refunded',
  Failed: 'failed',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
