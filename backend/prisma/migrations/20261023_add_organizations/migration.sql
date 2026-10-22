DO $$ BEGIN
  CREATE TYPE "OrganizationType" AS ENUM ('BANK', 'SACCO', 'MICROFINANCE', 'PRIVATE_LENDER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MembershipStatus" AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" SERIAL PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "type" "OrganizationType" NOT NULL,
  "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
  "currency" text NOT NULL DEFAULT 'UGX',
  "timeZone" text NOT NULL DEFAULT 'Africa/Kampala',
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "organization_memberships" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" integer NOT NULL,
  "userId" integer NOT NULL,
  "role" text NOT NULL,
  "status" "MembershipStatus" NOT NULL DEFAULT 'active',
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
  CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "organization_memberships_organizationId_userId_key" UNIQUE ("organizationId", "userId")
);

CREATE INDEX IF NOT EXISTS "organization_memberships_userId_status_idx" ON "organization_memberships" ("userId", "status");

CREATE TABLE IF NOT EXISTS "branches" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" integer NOT NULL,
  "name" text NOT NULL,
  "code" text,
  "status" text NOT NULL DEFAULT 'active',
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "branches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
  CONSTRAINT "branches_organizationId_name_key" UNIQUE ("organizationId", "name")
);

INSERT INTO "organizations" ("name", "type")
VALUES ('Default Organization', 'PRIVATE_LENDER')
ON CONFLICT ("name") DO NOTHING;

ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "organizationId" integer;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "organizationId" integer;
ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "organizationId" integer;

UPDATE "groups" SET "organizationId" = (SELECT id FROM "organizations" WHERE name = 'Default Organization') WHERE "organizationId" IS NULL;
UPDATE "clients" SET "organizationId" = (SELECT id FROM "organizations" WHERE name = 'Default Organization') WHERE "organizationId" IS NULL;
UPDATE "loans" l SET "organizationId" = COALESCE((SELECT c."organizationId" FROM "clients" c WHERE c.id = l."clientId"), (SELECT id FROM "organizations" WHERE name = 'Default Organization')) WHERE l."organizationId" IS NULL;

ALTER TABLE "groups" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "loans" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "groups" DROP CONSTRAINT IF EXISTS "groups_organizationId_fkey";
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_organizationId_fkey";
ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "loans_organizationId_fkey";
ALTER TABLE "groups" ADD CONSTRAINT "groups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
ALTER TABLE "clients" ADD CONSTRAINT "clients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
ALTER TABLE "loans" ADD CONSTRAINT "loans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "groups_organizationId_idx" ON "groups" ("organizationId");
CREATE INDEX IF NOT EXISTS "clients_organizationId_idx" ON "clients" ("organizationId");
CREATE INDEX IF NOT EXISTS "loans_organizationId_idx" ON "loans" ("organizationId");

INSERT INTO "organization_memberships" ("organizationId", "userId", "role")
SELECT o.id, u.id, u.role::text
FROM "organizations" o CROSS JOIN "users" u
WHERE o.name = 'Default Organization'
ON CONFLICT ("organizationId", "userId") DO NOTHING;
