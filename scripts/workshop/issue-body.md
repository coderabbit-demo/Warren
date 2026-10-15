## Request

Support partial refunds for captured payments.

## Acceptance criteria

- Merchants can specify an amount in cents and an optional reason.
- The total refunded for a payment must never exceed the captured amount.
- Refund creation must be idempotent using the Idempotency-Key header.
- Responses include the refund ID and current payment status.
