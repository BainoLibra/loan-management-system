const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const runtimeDatasourceUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
let prisma;
let init;
let pgPool;

if (!runtimeDatasourceUrl) {
  const dbInitError = new Error('DATABASE_URL (or DIRECT_URL) is required to initialize Prisma.');
  console.error(dbInitError.message);
  prisma = {
    $connect: async () => { throw dbInitError; },
    $disconnect: async () => {},
  };
  init = async () => { throw dbInitError; };
} else {
  pgPool = global.__prismaPgPool || new Pool({
    connectionString: runtimeDatasourceUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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
