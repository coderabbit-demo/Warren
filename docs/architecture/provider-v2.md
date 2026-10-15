# PayGrid V2 adapter

Warren can route payment operations to PayGrid V2 while retaining the original PayGrid integration. The `PAYMENTS_PROVIDER_V2` environment flag chooses one adapter at API startup. It defaults to `false`.

## Why an adapter

The API has one payment service and one refund service. Both services need charge, capture, and refund operations, but the provider APIs use different request and response shapes. `PaymentProvider` defines the three operations in Warren terms. `ProviderV1Adapter` wraps the existing client. `ProviderV2Adapter` wraps the new client and maps V2 responses into the same domain shape.

Routes do not choose a provider. `selectPaymentProvider` in the payment service creates the adapter using validated configuration. The selected adapter is shared by payment and refund services. This keeps an operation within one provider during a deployment.

## Configuration

| Variable | Meaning |
| --- | --- |
| `PAYMENTS_PROVIDER_V2` | `true` selects V2; default `false` |
| `PAYGRID_V2_API_KEY` | Bearer credential for the V2 API |
| `PAYGRID_V2_BASE_URL` | V2 API origin |
| `PAYGRID_V2_WEBHOOK_SECRET` | Signature secret for incoming V2 events |

All three V2 settings are required when the flag is enabled. The existing PayGrid settings remain required because the first provider is still the default. No credential values are stored in this repository.

## Domain status contract

Warren calls a completed capture `captured`. The status object in `packages/payments-core/src/status.ts` owns that value. The database migration updates existing `settled` rows to `captured` before the flag is enabled. Services and ledger entries use `PaymentStatus.Captured` for new transitions.

PayGrid V1 still speaks its original wire format. A V1 webhook containing `settled` is translated to `captured` before the payment service updates the row. The V1 adapter maps a settled charge into the captured provider state. V2 responses already use `captured`. This boundary keeps the database and API consistent regardless of provider.

## Charge creation

1. The API validates amount, currency, customer, and payment method.
2. `PaymentService.create` asks the selected provider to create a charge.
3. The adapter sends the provider's request shape.
4. The adapter returns a `providerRef` and a normalized state.
5. The payment repository stores the reference in `provider_ref` and the compatibility column.
6. The ledger records the initial authorized state.

The V2 client sends bearer authentication, JSON, and an optional idempotency header. It uses a five-second timeout by default. A server response in the 5xx range is retried up to three attempts with increasing delay. Client responses in the 4xx range are returned immediately as typed provider errors.

## Capture and refund

Capture uses the stored provider reference and the authorized amount. The selected adapter makes the provider call, then the service writes `captured` to the payment row and records a ledger entry. The capture route still requires a Warren idempotency key, which protects the API result across client retries.

Full refunds use the selected adapter. The service records a refund row, marks the payment `refunded`, and records a ledger entry. The refund route also uses the Warren idempotency wrapper. Provider-side idempotency headers can be forwarded through the adapter for operations that supply them.

## Incoming events

The existing V1 webhook path remains available. It accepts V1 event states and translates them before recording a transition. The V2 webhook path is `/provider/paygrid/v2/webhooks`. It reads raw JSON bytes, checks an HMAC-SHA256 signature with an equal-length buffer comparison, validates the event, and maps charge events to Warren statuses. A refund event does not change the payment status through that path because the refund service records its own transition.

Both paths pass state changes to `PaymentService.recordProviderStatus`. That method finds the payment by provider reference. Repeated status events do not add duplicate ledger entries.

## Merchant events

The merchant webhook dispatcher reads payment rows and chooses which statuses should produce an outbound event. It then maps the status to a merchant event type, signs the payload, and retries delivery. The event type for a completed capture is `payment.captured`. Existing refund and failure event types remain available.

## Migration sequence

1. Deploy the code with the V2 flag off.
2. Run `db/migrations/004_provider_ref.sql`.
3. Confirm the backfill and status update completed.
4. Set the V2 API URL and credentials in the target environment.
5. Set `PAYMENTS_PROVIDER_V2=true` for that environment.
6. Confirm charge, capture, refund, inbound event, ledger, and merchant event behavior.

The migration is additive for the reference column. Existing charge identifiers are copied into `provider_ref`. The old column remains for compatibility while all consumers move to the new name.

## Test boundaries

Client tests stub `fetch` and cover headers, retries, and provider errors. Mapper tests use JSON fixtures for authorized, captured, and refunded responses. Adapter tests check the domain contract. API tests use a small in-memory database fake and a provider fake. They do not require a database or external provider account.
