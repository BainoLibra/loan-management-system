const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const isSupabasePoolerHost = (hostname = '') => /(?:^|\.)pooler\.supabase\.com$/i.test(hostname);

const getSupabaseProjectRef = (connectionString) => {
  try {
    const url = new URL(connectionString);
    const host = url.hostname;
    const username = decodeURIComponent(url.username || '');
    const dbHostMatch = host.match(/^db\.([^.]+)\.supabase\.co(?:\.in)?$/i)?.[1];
    if (dbHostMatch) return dbHostMatch;

    if (isSupabasePoolerHost(host)) {
      const poolerUserMatch = username.match(/^postgres\.(.+)$/i)?.[1];
      if (poolerUserMatch) return poolerUserMatch;
    }

    return username.startsWith('postgres.') ? username.split('.')[1] : null;
  } catch (_error) {
    return null;
  }
};

const deriveSupabaseDirectUrl = (connectionString) => {
  if (!connectionString) return '';

  try {
    const url = new URL(connectionString);
    if (!isSupabasePoolerHost(url.hostname)) return '';

    const projectRef = getSupabaseProjectRef(connectionString);
    if (!projectRef) return '';

    const directUrl = new URL(connectionString);
    directUrl.hostname = `db.${projectRef}.supabase.co`;
    directUrl.port = '5432';
    return directUrl.toString();
  } catch (_error) {
    return '';
  }
};

const normalizeSupabaseDatasource = (connectionString) => {
  return connectionString;
};

const datasourceCandidates = [
  ['DATABASE_URL', process.env.DATABASE_URL],
  ['POSTGRES_PRISMA_URL', process.env.POSTGRES_PRISMA_URL],
  ['POSTGRES_URL', process.env.POSTGRES_URL],
  ['DIRECT_URL', process.env.DIRECT_URL],
  ['POSTGRES_URL_NON_POOLING', process.env.POSTGRES_URL_NON_POOLING],
];
const selectedDatasource = datasourceCandidates.find(([_name, value]) => Boolean(value));
const runtimeDatasourceName = selectedDatasource?.[0];
const runtimeDatasourceUrl = normalizeSupabaseDatasource(selectedDatasource?.[1]);
const getConnectionFailureMessage = (error) => {
  const base = runtimeDatasourceName
    ? `Database connection failed using ${runtimeDatasourceName}.`
    : 'Database connection failed.';

  const sanitizedSource = getSafeConnectionInfo(runtimeDatasourceUrl || '');
  const hostInfo = `${sanitizedSource.host}:${sanitizedSource.port}/${sanitizedSource.database}`;
  const detail = error?.message || 'Unknown database error';
  return `${base} Check the Supabase connection string in backend/.env or your deployment environment. Active source: ${hostInfo}. Prisma reported: ${detail}`;
};
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
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  const pgAdapter = new PrismaPg(pgPool);

  // Always cache globally — in serverless each Lambda container is isolated,
  // so this only reuses connections within the same warm instance, not across them.
  global.__prismaPgPool = pgPool;

  prisma = global.__prismaClient || new PrismaClient({ adapter: pgAdapter });

  global.__prismaClient = prisma;

  init = async () => {
    console.log('Initializing database connection:', getSafeConnectionInfo(runtimeDatasourceUrl));
    try {
      await prisma.$connect();
    } catch (error) {
      const message = getConnectionFailureMessage(error);
      console.error(message);
      throw new Error(message);
    }

    if (process.env.SEED_DEFAULT_ADMIN === 'false') {
      return;
    }

    const adminExists = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    if (!adminExists) {
      const hashedAdminPassword = await bcrypt.hash('admin', 10);
      await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@example.com',
          password: hashedAdminPassword,
          role: 'admin',
          status: 'active',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    } else if (!adminExists.emailVerified || adminExists.status !== 'active') {
      await prisma.user.update({
        where: { id: adminExists.id },
        data: { emailVerified: true, status: 'active' },
      });
    }

    // Ensure all admin users in the system are verified and active
    await prisma.user.updateMany({
      where: { role: 'admin' },
      data: { emailVerified: true, status: 'active' },
    }).catch(() => {});
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
