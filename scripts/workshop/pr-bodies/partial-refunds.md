## Summary
Adds partial refunds so merchants can refund part of a captured payment, for example one item from a multi-item order.

## Changes
- New `POST /payments/:id/refunds` endpoint accepting `amountCents` and an optional `reason`
- `RefundService.createPartialRefund` validates the amount against the captured payment and records the refund
- Payments move to `partially_refunded` until fully refunded
- `getRefundSummary` reporting helper
- Small cleanups in the refunds service and repository (naming, comments, import order)

## Testing
- Unit tests for a valid partial refund and for rejecting an amount above the captured total
- `npm run ci` passes

## Linked issue
Closes #1
