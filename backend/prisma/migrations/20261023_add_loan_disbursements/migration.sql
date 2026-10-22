DO $$ BEGIN
  CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "loan_disbursements" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" integer NOT NULL,
  "loanId" integer NOT NULL,
  "disbursedBy" integer NOT NULL,
  "amount" numeric(15,2) NOT NULL,
  "paymentMethod" text NOT NULL,
  "reference" text,
  "destination" text,
  "idempotencyKey" text NOT NULL UNIQUE,
  "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING',
  "failureReason" text,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" timestamp(3) without time zone,
  CONSTRAINT "loan_disbursements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "loan_disbursements_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE,
  CONSTRAINT "loan_disbursements_disbursedBy_fkey" FOREIGN KEY ("disbursedBy") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "loan_disbursements_amount_check" CHECK ("amount" > 0)
);

CREATE INDEX IF NOT EXISTS "loan_disbursements_organizationId_status_idx" ON "loan_disbursements" ("organizationId", "status");
CREATE INDEX IF NOT EXISTS "loan_disbursements_loanId_createdAt_idx" ON "loan_disbursements" ("loanId", "createdAt");