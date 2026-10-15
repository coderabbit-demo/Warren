# Platform overview

Warren serves merchants that accept payments and issue invoices through an API. The API is an Express service in `apps/api`. Its database is PostgreSQL. The workspace uses npm workspaces so common rules live in focused packages.

## Request path

An HTTP request enters `app.ts`. The provider webhook route reads raw bytes before JSON parsing. Other routes use the JSON parser and bearer authentication. Authentication puts the merchant identifier in `req.auth`. Route handlers validate input with Zod. Services coordinate provider calls, repositories, and ledger entries. Repositories own parameterized SQL statements. Errors pass through a shared error handler.

## Payments

The payment API accepts an amount in cents, a currency, customer details, and a payment method token or legacy card object. `PaymentService` asks PayGrid to create an authorization. The returned charge ID is stored on the payment. Capturing calls PayGrid and moves the payment to `settled`. The capture endpoint requires an idempotency key. The key store records the response for a repeated request. The payment row stores the captured amount independently from the authorized amount.

## Refunds

`RefundService` issues a full refund against a settled payment. The refund route uses the same idempotency wrapper as capture. The refund repository records the provider result. The payment then moves to `refunded`. Refunds are listed by payment and merchant.

## Invoices

The invoice service totals line items using integer cents. Invoice routes create, list, fetch, and export records. The repository owns invoice queries and the CSV route owns formatting. The database maintains uniqueness of invoice numbers per merchant. An internal reconciliation job also uses the repository's direct ID lookup.

## Provider webhooks

PayGrid sends raw JSON with an HMAC signature. The inbound route checks the signature before parsing the event. The service finds the payment by provider charge ID. If the status changed, the service updates the payment row. It also records a ledger entry for the change. Duplicate status events are ignored.

## Ledger

Ledger entries capture each payment status transition. Each row records the payment, merchant, status kind, amount, and time. The ledger package owns the insert statement. The API calls it after creation, capture, refund, and inbound updates. Entries are useful for reconciliation and operational reporting.

## Merchant webhooks

The dispatcher loads pending payment events from its event store. It checks whether the payment status maps to an external event. It maps that status to a merchant-facing event type. The payload includes an event ID and payment ID. The dispatcher signs exact payload bytes with HMAC-SHA256. It posts JSON to the merchant's configured URL. A fixed retry policy makes up to three attempts. The event store marks a successful delivery complete.

## Local development

The tests replace database and HTTP boundaries with small fakes. No test requires a running PostgreSQL server. The CI script lints, typechecks, and runs tests. Migrations in `db/migrations` describe the production database. Set the environment variables from the README before starting the API. Run `npm run dev -w @warren/api` to listen locally.

## Boundaries

`@warren/money` defines cent values and conversions. `@warren/payments-core` defines status values and the PayGrid client. `@warren/ledger` writes status entries. `@warren/webhook-dispatcher` handles merchant delivery. The API wires those pieces together at startup. Provider calls remain behind service methods so routes stay narrow. Database access remains behind repository methods so tests can substitute a `Db`.
