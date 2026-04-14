require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

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

const outputDir = process.env.EXPORT_DIR || path.join(__dirname, '..', 'exports');
const outputFile = process.env.EXPORT_FILE || `railway-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

const tables = ['users', 'clients', 'loans', 'repayments', 'audit_logs'];

async function main() {
  console.log(`Connecting to Railway MySQL at ${sourceConfig.host}:${sourceConfig.port}/${sourceConfig.database}`);
  const connection = await mysql.createConnection(sourceConfig);

  try {
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
    const filePath = path.join(outputDir, outputFile);
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');

    console.log(`Export saved to ${filePath}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Export failed:', error);
  process.exit(1);
});