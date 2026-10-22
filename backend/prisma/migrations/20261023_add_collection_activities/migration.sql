CREATE TABLE IF NOT EXISTS "collection_activities" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" integer NOT NULL,
  "loanId" integer NOT NULL,
  "createdBy" integer NOT NULL,
  "assignedTo" integer,
  "activityType" text NOT NULL,
  "outcome" text,
  "notes" text,
  "promiseDate" timestamp(3) without time zone,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collection_activities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "collection_activities_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE,
  CONSTRAINT "collection_activities_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "collection_activities_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "collection_activities_organizationId_createdAt_idx" ON "collection_activities" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "collection_activities_loanId_createdAt_idx" ON "collection_activities" ("loanId", "createdAt");
CREATE INDEX IF NOT EXISTS "collection_activities_assignedTo_createdAt_idx" ON "collection_activities" ("assignedTo", "createdAt");