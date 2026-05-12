const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.lujvlbvpbzkqejdvzcel:5%3FKAhSmKc3rNqVQ@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const hasColumn = async (client, tableName, columnName) => {
  const result = await client.query(
    `select 1
     from information_schema.columns
     where table_schema = 'public'
       and table_name = $1
       and column_name = $2
     limit 1`,
    [tableName, columnName]
  );
  return result.rowCount > 0;
};

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');

    await client.query(`CREATE TABLE IF NOT EXISTS "groups" (
      "id" SERIAL PRIMARY KEY,
      "name" text NOT NULL UNIQUE,
      "description" text,
      "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`ALTER TABLE "clients"
      ADD COLUMN IF NOT EXISTS "firstName" text,
      ADD COLUMN IF NOT EXISTS "lastName" text,
      ADD COLUMN IF NOT EXISTS "address" text,
      ADD COLUMN IF NOT EXISTS "guarantorName" text,
      ADD COLUMN IF NOT EXISTS "guarantorPhone" text,
      ADD COLUMN IF NOT EXISTS "guarantorId" text,
      ADD COLUMN IF NOT EXISTS "groupId" integer`);

    if (await hasColumn(client, 'clients', 'name')) {
      await client.query(`UPDATE "clients"
       SET "firstName" = split_part("name", ' ', 1),
           "lastName" = regexp_replace("name", '^[^ ]+\\s+', '')
       WHERE "name" IS NOT NULL`);

      await client.query(`UPDATE "clients"
       SET "lastName" = split_part("name", ' ', 2)
       WHERE "lastName" IS NULL OR "lastName" = ''`);

      await client.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "name"`);
    }

    await client.query(`ALTER TABLE "clients"
      ALTER COLUMN "firstName" SET NOT NULL,
      ALTER COLUMN "lastName" SET NOT NULL`);

    await client.query(`ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_groupId_fkey"`);
    await client.query(`ALTER TABLE "clients"
      ADD CONSTRAINT "clients_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS "clients_groupId_idx" ON "clients" ("groupId")`);

    await client.query(`ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "resetPasswordToken" text,
      ADD COLUMN IF NOT EXISTS "resetPasswordExpires" timestamp(3) without time zone`);

    await client.query(`ALTER TABLE "loans"
      ADD COLUMN IF NOT EXISTS "guarantorName" text,
      ADD COLUMN IF NOT EXISTS "notes" text,
      ADD COLUMN IF NOT EXISTS "documents" text`);

    await client.query(`CREATE TABLE IF NOT EXISTS "schedules" (
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
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS "schedules_loanId_idx" ON "schedules" ("loanId")`);

    await client.query(`ALTER TABLE "repayments" DROP CONSTRAINT IF EXISTS "repayments_loanId_fkey"`);
    await client.query(`ALTER TABLE "repayments"
      ADD CONSTRAINT "repayments_loanId_fkey"
      FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE`);

    await client.query('COMMIT');
    console.log('Legacy schema migration applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
