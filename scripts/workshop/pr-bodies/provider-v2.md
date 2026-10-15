## Summary
Generated with Claude Code.

Introduces a `PaymentProvider` adapter in `@warren/payments-core` and adds a PayGrid V2 client behind the `PAYMENTS_PROVIDER_V2` feature flag. V1 remains the default. Status naming is aligned with V2 terminology (`settled` is now `captured`).

## Changes
- `payments-core`: `PaymentProvider` interface, `ProviderV1Adapter`, new `providerV2` client, mapper, and error types
- `db`: `004_provider_ref.sql` adds `provider_ref`, backfills it, and migrates existing `settled` rows to `captured`
- `PaymentStatus.Settled` renamed to `PaymentStatus.Captured` across api, ledger, and invoices
- `webhook-dispatcher`: emits `payment.captured` and the new V2 event types
- `apps/api`: `paymentService` selects the provider from the feature flag
- Docs: `docs/architecture/provider-v2.md`

## Rollout
Flag defaults to off. Enable per environment once the backfill completes.

## Testing
All tests pass (`npm run ci`). Added unit tests for the V2 client, mapper, and adapter, and updated fixtures for the status rename.
