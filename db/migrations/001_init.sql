CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  webhook_url text,
  webhook_signing_secret text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  captured_cents bigint NOT NULL DEFAULT 0 CHECK (captured_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL,
  provider_charge_id text,
  customer_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_merchant_created ON payments (merchant_id, created_at DESC);

CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  reason text,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refunds_payment ON refunds (payment_id, created_at DESC);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  number text NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  status text NOT NULL,
  line_items jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, number)
);
CREATE INDEX invoices_merchant_created ON invoices (merchant_id, created_at DESC);
