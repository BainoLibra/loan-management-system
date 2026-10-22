DO $$ BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" integer NOT NULL,
  "userId" integer,
  "clientId" integer,
  "channel" text NOT NULL DEFAULT 'EMAIL',
  "eventType" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "recipientEmail" text,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" integer NOT NULL DEFAULT 0,
  "lastError" text,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" timestamp(3) without time zone,
  CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "notifications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "notifications_organizationId_status_createdAt_idx" ON "notifications" ("organizationId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_userId_status_createdAt_idx" ON "notifications" ("userId", "status", "createdAt");