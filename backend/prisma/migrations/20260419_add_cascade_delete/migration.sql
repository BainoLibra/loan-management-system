-- Legacy database transform to align the existing Supabase schema with the current Prisma schema.

CREATE TABLE IF NOT EXISTS "groups" (
  "id" SERIAL PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "description" text,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "firstName" text,
  ADD COLUMN IF NOT EXISTS "lastName" text,
  ADD COLUMN IF NOT EXISTS "address" text,
  ADD COLUMN IF NOT EXISTS "guarantorName" text,
  ADD COLUMN IF NOT EXISTS "guarantorPhone" text,
  ADD COLUMN IF NOT EXISTS "guarantorId" text,
  ADD COLUMN IF NOT EXISTS "groupId" integer;

UPDATE "clients"
SET "firstName" = split_part("name", ' ', 1),
    "lastName" = regexp_replace("name", '^[^ ]+\s+', '')
WHERE "name" IS NOT NULL;

UPDATE "clients"
SET "lastName" = split_part("name", ' ', 2)
WHERE "lastName" IS NULL OR "lastName" = '';

ALTER TABLE "clients"
  ALTER COLUMN "firstName" SET NOT NULL,
  ALTER COLUMN "lastName" SET NOT NULL;

ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_groupId_fkey";

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "clients_groupId_idx" ON "clients" ("groupId");

ALTER TABLE "clients" DROP COLUMN IF EXISTS "name";

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "resetPasswordToken" text,
  ADD COLUMN IF NOT EXISTS "resetPasswordExpires" timestamp(3) without time zone;

ALTER TABLE "loans"
  ADD COLUMN IF NOT EXISTS "guarantorName" text,
  ADD COLUMN IF NOT EXISTS "notes" text,
  ADD COLUMN IF NOT EXISTS "documents" text;

CREATE TABLE IF NOT EXISTS "schedules" (
  "id" SERIAL PRIMARY KEY,
  "loanId" integer NOT NULL,
  "month" integer NOT NULL,
  "dueDate" timestamp(3) without time zone NOT NULL,
  "payment" numeric(15,2) NOT NULL,
  "principal" numeric(15,2) NOT NULL,
  "interest" numeric(15,2) NOT NULL,
  "balance" numeric(15,2) NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "penalty" numeric(15,2) NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "schedules_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "schedules_loanId_idx" ON "schedules" ("loanId");

ALTER TABLE "repayments" DROP CONSTRAINT IF EXISTS "repayments_loanId_fkey";

ALTER TABLE "repayments"
  ADD CONSTRAINT "repayments_loanId_fkey"
  FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE;
