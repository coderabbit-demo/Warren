CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES payments(id),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  kind text NOT NULL,
  amount_cents bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_payment_created ON ledger_entries (payment_id, created_at DESC);
