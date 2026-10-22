CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" integer NOT NULL,
  "createdBy" integer,
  "entryType" text NOT NULL,
  "referenceType" text NOT NULL,
  "referenceId" integer NOT NULL,
  "debitAccount" text NOT NULL,
  "creditAccount" text NOT NULL,
  "amount" numeric(15,2) NOT NULL,
  "description" text,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "journal_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "journal_entries_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "journal_entries_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "journal_entries_accounts_check" CHECK ("debitAccount" <> "creditAccount")
);

CREATE INDEX IF NOT EXISTS "journal_entries_organizationId_createdAt_idx" ON "journal_entries" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "journal_entries_referenceType_referenceId_idx" ON "journal_entries" ("referenceType", "referenceId");