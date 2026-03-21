const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const config = {
    host: process.env.MYSQL_HOST || 'caboose.proxy.rlwy.net',
    port: parseInt(process.env.MYSQL_PORT || '27655'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'RGftLlEgSNqkTBiTnAdoVclndgqBKGob',
    database: process.env.MYSQL_DATABASE || 'railway',
    multipleStatements: true,
  };

  console.log(`Connecting to MySQL at ${config.host}:${config.port}/${config.database} ...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected successfully.');

    const sqlFile = path.join(__dirname, '..', 'loan_management.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Running schema migration...');
    await connection.query(sql);
    console.log('Schema migration completed successfully!');

    // Verify tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\nTables in database:');
    tables.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`  - ${tableName}`);
    });

  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
