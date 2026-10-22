ALTER TABLE "repayments"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" text;

CREATE UNIQUE INDEX IF NOT EXISTS "repayments_idempotencyKey_key"
  ON "repayments" ("idempotencyKey");