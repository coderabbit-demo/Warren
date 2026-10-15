CREATE TABLE merchant_webhook_endpoints (
  merchant_id uuid PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX merchant_webhook_endpoints_updated
  ON merchant_webhook_endpoints (updated_at DESC);
