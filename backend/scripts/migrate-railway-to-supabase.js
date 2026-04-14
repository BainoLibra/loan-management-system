require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const migrationDatasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!migrationDatasourceUrl) {
  throw new Error('DIRECT_URL (or DATABASE_URL) is required for migration.');
}

const pgPool = new Pool({ connectionString: migrationDatasourceUrl });
const pgAdapter = new PrismaPg(pgPool);
const prisma = new PrismaClient({ adapter: pgAdapter });

const parseMysqlUrl = (value) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return {
      host: url.hostname || undefined,
      port: url.port ? Number(url.port) : undefined,
      user: url.username || undefined,
      password: url.password || undefined,
      database: url.pathname ? url.pathname.replace(/^\//, '') : undefined,
    };
  } catch {
    return null;
  }
};

const resolveSourceConfig = () => {
  const mysqlUrl = parseMysqlUrl(process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL);

  return {
    host: process.env.MYSQL_HOST || process.env.MYSQLHOST || mysqlUrl?.host || 'caboose.proxy.rlwy.net',
    port: Number(process.env.MYSQL_PORT || process.env.MYSQLPORT || mysqlUrl?.port || 27655),
    user: process.env.MYSQL_USER || process.env.MYSQLUSER || mysqlUrl?.user || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || mysqlUrl?.password || '',
    database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || mysqlUrl?.database || 'railway',
  };
};

const sourceConfig = resolveSourceConfig();

const forceImport = process.env.FORCE_IMPORT === 'true';
const outputDir = process.env.EXPORT_DIR || path.join(__dirname, '..', 'exports');
const outputFile = process.env.EXPORT_FILE || `railway-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
const outputPath = path.join(outputDir, outputFile);

const toDate = (value) => (value ? new Date(value) : null);
const toDecimal = (value) => (value === null || value === undefined ? null : String(value));

const tables = ['users', 'clients', 'loans', 'repayments', 'audit_logs'];

async function ensureDestinationSchema() {
  const statements = [
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN CREATE TYPE "UserRole" AS ENUM ('admin', 'loan_officer', 'cashier', 'client'); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive'); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientStatus') THEN CREATE TYPE "ClientStatus" AS ENUM ('active', 'inactive'); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LoanStatus') THEN CREATE TYPE "LoanStatus" AS ENUM ('applied', 'approved', 'disbursed', 'closed', 'rejected'); END IF; END $$;`,
    `CREATE TABLE IF NOT EXISTS "users" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "password" TEXT NOT NULL,
      "role" "UserRole" NOT NULL,
      "status" "UserStatus" NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "clients" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "phone" TEXT,
      "email" TEXT,
      "identifier" TEXT,
      "status" "ClientStatus" NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "loans" (
      "id" SERIAL PRIMARY KEY,
      "clientId" INTEGER NOT NULL,
      "amount" DECIMAL(15,2) NOT NULL,
      "interestRate" DECIMAL(5,2) NOT NULL,
      "termMonths" INTEGER NOT NULL,
      "status" "LoanStatus" NOT NULL DEFAULT 'applied',
      "appliedAt" TIMESTAMP(3),
      "approvedBy" INTEGER,
      "approvedAt" TIMESTAMP(3),
      "disbursedAt" TIMESTAMP(3),
      "balance" DECIMAL(15,2) NOT NULL,
      "createdBy" INTEGER NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "loans_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT "loans_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT "loans_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "repayments" (
      "id" SERIAL PRIMARY KEY,
      "loanId" INTEGER NOT NULL,
      "amount" DECIMAL(15,2) NOT NULL,
      "paidBy" INTEGER NOT NULL,
      "date" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "repayments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
      CONSTRAINT "repayments_paidBy_fkey" FOREIGN KEY ("paidBy") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT
    );`,
    `CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" SERIAL PRIMARY KEY,
      "userId" INTEGER,
      "action" TEXT,
      "entity" TEXT,
      "entityId" INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL
    );`,
    `CREATE INDEX IF NOT EXISTS "loans_clientId_idx" ON "loans"("clientId");`,
    `CREATE INDEX IF NOT EXISTS "loans_approvedBy_idx" ON "loans"("approvedBy");`,
    `CREATE INDEX IF NOT EXISTS "loans_createdBy_idx" ON "loans"("createdBy");`,
    `CREATE INDEX IF NOT EXISTS "repayments_loanId_idx" ON "repayments"("loanId");`,
    `CREATE INDEX IF NOT EXISTS "repayments_paidBy_idx" ON "repayments"("paidBy");`,
    `CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");`,
  ];

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
}

async function exportRailwayData(connection) {
  const exportData = {
    exportedAt: new Date().toISOString(),
    source: {
      host: sourceConfig.host,
      port: sourceConfig.port,
      database: sourceConfig.database,
    },
    tables: {},
  };

  for (const tableName of tables) {
    const [rows] = await connection.query(`SELECT * FROM ${tableName} ORDER BY id ASC`);
    exportData.tables[tableName] = rows.map((row) => ({ ...row }));
    console.log(`Exported ${rows.length} rows from ${tableName}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');

  return exportData;
}

async function resetDestinationIfNeeded() {
  const counts = await Promise.all([
    prisma.auditLog.count(),
    prisma.repayment.count(),
    prisma.loan.count(),
    prisma.client.count(),
    prisma.user.count(),
  ]);

  const total = counts.reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return;
  }

  if (!forceImport) {
    throw new Error('Destination database is not empty. Set FORCE_IMPORT=true to overwrite it.');
  }

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.repayment.deleteMany(),
    prisma.loan.deleteMany(),
    prisma.client.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function importTable(targetModel, rows, mapRow) {
  if (!rows.length) {
    return;
  }

  await prisma[targetModel].createMany({
    data: rows.map(mapRow),
    skipDuplicates: true,
  });
}

async function resetSequences() {
  for (const tableName of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tableName}"), 1), (SELECT MAX(id) IS NOT NULL FROM "${tableName}"))`
    );
  }
}

async function importExportData(exportData) {
  await ensureDestinationSchema();
  await resetDestinationIfNeeded();

  const tablesData = exportData.tables || {};

  await importTable('user', tablesData.users || [], (row) => ({
    id: Number(row.id),
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    status: row.status || 'active',
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt || row.createdAt),
  }));

  await importTable('client', tablesData.clients || [], (row) => ({
    id: Number(row.id),
    name: row.name,
    phone: row.phone,
    email: row.email,
    identifier: row.identifier,
    status: row.status || 'active',
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt || row.createdAt),
  }));

  await importTable('loan', tablesData.loans || [], (row) => ({
    id: Number(row.id),
    clientId: Number(row.clientId),
    amount: toDecimal(row.amount),
    interestRate: toDecimal(row.interestRate),
    termMonths: Number(row.termMonths),
    status: row.status,
    appliedAt: toDate(row.appliedAt),
    approvedBy: row.approvedBy ? Number(row.approvedBy) : null,
    approvedAt: toDate(row.approvedAt),
    disbursedAt: toDate(row.disbursedAt),
    balance: toDecimal(row.balance),
    createdBy: Number(row.createdBy),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt || row.createdAt),
  }));

  await importTable('repayment', tablesData.repayments || [], (row) => ({
    id: Number(row.id),
    loanId: Number(row.loanId),
    amount: toDecimal(row.amount),
    paidBy: Number(row.paidBy),
    date: toDate(row.date),
    createdAt: toDate(row.createdAt),
  }));

  await importTable('auditLog', tablesData.audit_logs || [], (row) => ({
    id: Number(row.id),
    userId: row.userId ? Number(row.userId) : null,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId ? Number(row.entityId) : null,
    createdAt: toDate(row.createdAt),
  }));

  await resetSequences();
}

async function main() {
  console.log(`Connecting to Railway MySQL at ${sourceConfig.host}:${sourceConfig.port}/${sourceConfig.database}`);
  const source = await mysql.createConnection(sourceConfig);

  try {
    await prisma.$connect();
    const exportData = await exportRailwayData(source);
    await importExportData(exportData);

    console.log(`Migration completed successfully. Export saved at ${outputPath}`);
  } finally {
    await source.end();
    await prisma.$disconnect();
    await pgPool.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});