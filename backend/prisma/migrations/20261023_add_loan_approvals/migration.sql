DO $$ BEGIN
  CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'REVISION_REQUESTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "loan_approvals" (
  "id" SERIAL PRIMARY KEY,
  "loanId" integer NOT NULL,
  "approverId" integer NOT NULL,
  "decision" "ApprovalDecision" NOT NULL,
  "approvedAmount" numeric(15,2),
  "comments" text,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loan_approvals_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE,
  CONSTRAINT "loan_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "loan_approvals_loanId_createdAt_idx" ON "loan_approvals" ("loanId", "createdAt");
CREATE INDEX IF NOT EXISTS "loan_approvals_approverId_createdAt_idx" ON "loan_approvals" ("approverId", "createdAt");