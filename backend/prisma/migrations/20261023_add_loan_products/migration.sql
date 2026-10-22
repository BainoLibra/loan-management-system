DO $$ BEGIN
  CREATE TYPE "RepaymentFrequency" AS ENUM ('WEEKLY', 'MONTHLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "loan_products" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" integer NOT NULL,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "minAmount" numeric(15,2) NOT NULL,
  "maxAmount" numeric(15,2) NOT NULL,
  "interestRate" numeric(5,2) NOT NULL,
  "minTermMonths" integer NOT NULL,
  "maxTermMonths" integer NOT NULL,
  "repaymentFrequency" "RepaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
  "approvalLimit" numeric(15,2) NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loan_products_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
  CONSTRAINT "loan_products_organizationId_code_key" UNIQUE ("organizationId", "code"),
  CONSTRAINT "loan_products_amounts_check" CHECK ("minAmount" > 0 AND "maxAmount" >= "minAmount"),
  CONSTRAINT "loan_products_terms_check" CHECK ("minTermMonths" > 0 AND "maxTermMonths" >= "minTermMonths"),
  CONSTRAINT "loan_products_rate_check" CHECK ("interestRate" >= 0 AND "interestRate" <= 100),
  CONSTRAINT "loan_products_approval_limit_check" CHECK ("approvalLimit" > 0)
);

CREATE INDEX IF NOT EXISTS "loan_products_organizationId_active_idx" ON "loan_products" ("organizationId", "active");

ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "productId" integer;
ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "loans_productId_fkey";
ALTER TABLE "loans" ADD CONSTRAINT "loans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "loan_products"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "loans_productId_idx" ON "loans" ("productId");