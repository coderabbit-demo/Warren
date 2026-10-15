# Warren Payments Platform

Warren provides payment, refund, invoice, and webhook APIs for mid-market merchants. This repository contains the API and the shared packages used by its payment flow.

## Workspace

| Path | Purpose |
| --- | --- |
| `apps/api` | Express API and PostgreSQL repositories |
| `packages/money` | Integer-cent helpers |
| `packages/payments-core` | Payment types and PayGrid client |
| `packages/ledger` | Payment status ledger |
| `services/webhook-dispatcher` | Merchant event delivery |
| `db/migrations` | PostgreSQL schema |

## Getting started

Use Node 24 and npm. Run `npm ci`, then `npm run ci`. Tests use fakes and do not require PostgreSQL or PayGrid. For a local API, apply the SQL migrations to a development database, set the variables below, and run `npm run dev -w @warren/api`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Bearer token signing secret |
| `PAYGRID_API_KEY` | PayGrid API credential |
| `PAYGRID_BASE_URL` | PayGrid API URL |
| `PROVIDER_WEBHOOK_SECRET` | Incoming PayGrid webhook secret |
| `WEBHOOK_SIGNING_SECRET` | Outgoing merchant webhook secret |
| `PORT` | API port, default 3000 |

The API exposes `/health` for a simple readiness check. See `docs/architecture/overview.md` for the request flow and `docs/standards` for coding rules.
