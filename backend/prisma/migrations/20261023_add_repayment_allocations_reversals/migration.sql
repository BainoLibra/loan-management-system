DO $$ BEGIN
  CREATE TYPE "RepaymentStatus" AS ENUM ('ACTIVE', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "repayment_allocations" (
  "id" SERIAL PRIMARY KEY,
  "repaymentId" integer NOT NULL,
  "scheduleId" integer,
  "component" text NOT NULL,
  "amount" numeric(15,2) NOT NULL,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "repayment_allocations_repaymentId_fkey" FOREIGN KEY ("repaymentId") REFERENCES "repayments"("id") ON DELETE CASCADE,
  CONSTRAINT "repayment_allocations_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE RESTRICT,
  CONSTRAINT "repayment_allocations_amount_check" CHECK ("amount" > 0)
);

CREATE INDEX IF NOT EXISTS "repayment_allocations_repaymentId_idx" ON "repayment_allocations" ("repaymentId");
CREATE INDEX IF NOT EXISTS "repayment_allocations_scheduleId_idx" ON "repayment_allocations" ("scheduleId");

CREATE TABLE IF NOT EXISTS "repayment_reversals" (
  "id" SERIAL PRIMARY KEY,
  "repaymentId" integer NOT NULL UNIQUE,
  "reversedBy" integer NOT NULL,
  "reason" text NOT NULL,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "repayment_reversals_repaymentId_fkey" FOREIGN KEY ("repaymentId") REFERENCES "repayments"("id") ON DELETE RESTRICT,
  CONSTRAINT "repayment_reversals_reversedBy_fkey" FOREIGN KEY ("reversedBy") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "repayment_reversals_reversedBy_createdAt_idx" ON "repayment_reversals" ("reversedBy", "createdAt");

ALTER TABLE "repayments" ADD COLUMN IF NOT EXISTS "status" "RepaymentStatus" NOT NULL DEFAULT 'ACTIVE';