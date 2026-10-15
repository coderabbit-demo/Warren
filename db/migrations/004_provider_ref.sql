ALTER TABLE payments
  ADD COLUMN provider_ref text;

UPDATE payments
SET provider_ref = provider_charge_id
WHERE provider_ref IS NULL
  AND provider_charge_id IS NOT NULL;

CREATE INDEX payments_provider_ref
  ON payments (provider_ref)
  WHERE provider_ref IS NOT NULL;

UPDATE payments
SET status = 'captured',
    updated_at = now()
WHERE status = 'settled';

COMMENT ON COLUMN payments.provider_ref IS
  'Stable provider reference used by the PayGrid adapter.';
