const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const datasourceCandidates = [
  ['POSTGRES_PRISMA_URL', process.env.POSTGRES_PRISMA_URL],
  ['POSTGRES_URL', process.env.POSTGRES_URL],
  ['DATABASE_URL', process.env.DATABASE_URL],
  ['DIRECT_URL', process.env.DIRECT_URL],
  ['POSTGRES_URL_NON_POOLING', process.env.POSTGRES_URL_NON_POOLING],
];
const selectedDatasource = datasourceCandidates.find(([_name, value]) => Boolean(value));
const runtimeDatasourceName = selectedDatasource?.[0];
const runtimeDatasourceUrl = selectedDatasource?.[1];
let prisma;
let init;
let pgPool;

const getSafeConnectionInfo = (connectionString) => {
  try {
    const url = new URL(connectionString);
    return {
      source: runtimeDatasourceName,
      host: url.hostname,
      port: url.port || '(default)',
      database: url.pathname.replace(/^\//, '') || '(none)',
    };
  } catch (_error) {
    return {
      source: runtimeDatasourceName,
      host: '(unparseable)',
      port: '(unknown)',
      database: '(unknown)',
    };
  }
};

const getPgConnectionOptions = (connectionString) => {
  const requiresSsl = /supabase\.com|pooler\.supabase\.com/.test(connectionString);
  if (!requiresSsl) return { connectionString, ssl: undefined };

  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('sslcert');
    url.searchParams.delete('sslkey');
    url.searchParams.delete('sslrootcert');

    return {
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
    };
  } catch (_error) {
    return {
      connectionString,
      ssl: { rejectUnauthorized: false },
    };
  }
};

if (!runtimeDatasourceUrl) {
  const dbInitError = new Error('A PostgreSQL connection URL is required to initialize Prisma.');
  console.error(dbInitError.message);
  prisma = {
    $connect: async () => { throw dbInitError; },
    $disconnect: async () => {},
  };
  init = async () => { throw dbInitError; };
} else {
  const pgConnectionOptions = getPgConnectionOptions(runtimeDatasourceUrl);
  pgPool = global.__prismaPgPool || new Pool({
    ...pgConnectionOptions,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  const pgAdapter = new PrismaPg(pgPool);

  if (process.env.NODE_ENV !== 'production') {
    global.__prismaPgPool = pgPool;
  }

  prisma = global.__prismaClient || new PrismaClient({ adapter: pgAdapter });

  if (process.env.NODE_ENV !== 'production') {
    global.__prismaClient = prisma;
  }

  init = async () => {
    console.log('Initializing database connection:', getSafeConnectionInfo(runtimeDatasourceUrl));
    await prisma.$connect();

    if (process.env.SEED_DEFAULT_ADMIN === 'false') {
      return;
    }

    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const hashedAdminPassword = await bcrypt.hash('admin', 10);
      await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@example.com',
          password: hashedAdminPassword,
          role: 'admin',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    }
  };
}

const disconnect = async () => {
  if (prisma?.$disconnect) {
    await prisma.$disconnect();
  }

  if (pgPool?.end) {
    await pgPool.end();
  }
};

module.exports = { prisma, init, disconnect };
