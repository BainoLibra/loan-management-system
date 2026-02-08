const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'loan_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function init() {
  // create tables if they do not exist (MySQL syntax)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      password VARCHAR(255),
      role VARCHAR(50)
    ) ENGINE=InnoDB;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      identifier VARCHAR(255)
    ) ENGINE=InnoDB;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS loans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      clientId INT,
      amount DOUBLE,
      interestRate DOUBLE,
      termMonths INT,
      status VARCHAR(50),
      appliedAt DATETIME,
      approvedBy INT,
      approvedAt DATETIME,
      disbursedAt DATETIME,
      balance DOUBLE,
      FOREIGN KEY (clientId) REFERENCES clients(id)
    ) ENGINE=InnoDB;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS repayments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      loanId INT,
      amount DOUBLE,
      date DATETIME,
      FOREIGN KEY (loanId) REFERENCES loans(id)
    ) ENGINE=InnoDB;
  `);

  // seed admin user if none
  const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM users');
  const cnt = rows && rows[0] ? rows[0].cnt : 0;
  if (cnt === 0) {
    await pool.execute('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', ['Admin','admin@example.com','admin','admin']);
  }
}

// Adapter to mimic the sqlite3 API used in the codebase
const db = {
  get: (sql, params, cb) => {
    pool.query(sql, params)
      .then(([rows]) => cb(null, rows && rows[0] ? rows[0] : null))
      .catch(err => cb(err));
  },
  all: (sql, params, cb) => {
    pool.query(sql, params)
      .then(([rows]) => cb(null, rows))
      .catch(err => cb(err));
  },
  run: (sql, params, cb) => {
    pool.execute(sql, params)
      .then(([result]) => {
        const info = { lastID: result.insertId || null, changes: result.affectedRows || 0 };
        if (cb) cb.call(info, null);
      })
      .catch(err => { if (cb) cb(err); });
  }
};

module.exports = { db, init };
