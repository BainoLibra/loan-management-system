const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'loan_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function init() {
  // create tables if they do not exist
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','loan_officer','cashier') NOT NULL,
      status ENUM('active','inactive') DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) DEFAULT NULL,
      email VARCHAR(100) DEFAULT NULL,
      identifier VARCHAR(50) DEFAULT NULL,
      status ENUM('active','inactive') DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS loans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      clientId INT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      interestRate DECIMAL(5,2) NOT NULL,
      termMonths INT NOT NULL,
      status ENUM('applied','approved','disbursed','closed') DEFAULT 'applied',
      appliedAt DATETIME DEFAULT NULL,
      approvedBy INT DEFAULT NULL,
      approvedAt DATETIME DEFAULT NULL,
      disbursedAt DATETIME DEFAULT NULL,
      balance DECIMAL(15,2) NOT NULL,
      createdBy INT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id),
      FOREIGN KEY (approvedBy) REFERENCES users(id),
      FOREIGN KEY (createdBy) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS repayments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      loanId INT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      paidBy INT NOT NULL,
      date DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (loanId) REFERENCES loans(id),
      FOREIGN KEY (paidBy) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT DEFAULT NULL,
      action VARCHAR(255) DEFAULT NULL,
      entity VARCHAR(50) DEFAULT NULL,
      entityId INT DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
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

module.exports = pool;
