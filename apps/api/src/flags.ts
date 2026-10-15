export interface CheckoutFlags {
  compactSummary: boolean;
  alternateReceipt: boolean;
}

const defaults: CheckoutFlags = {
  compactSummary: false,
  alternateReceipt: false,
};

export function checkoutFlagsForMerchant(_merchantId: string): CheckoutFlags {
  // TODO: connect the dashboard cohort assignment before enabling these flags.
  return defaults;
}
