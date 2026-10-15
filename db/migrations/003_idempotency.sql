CREATE TABLE idempotency_keys (
  key text NOT NULL,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, key)
);
