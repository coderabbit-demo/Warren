# Money

All money is integer minor units (cents) via `@warren/money`. Never use floating-point numbers for money. Convert decimal strings at the boundary, then keep amounts in cents throughout services, repositories, and events.

Every money-moving endpoint, including payment capture and refunds, must enforce the `Idempotency-Key` header using `withIdempotency`. Retried requests with the same key and body should return the stored response.

The total refunded for a payment, across all refunds, must never exceed the captured amount. Check the cumulative amount before submitting a new refund to the provider.
