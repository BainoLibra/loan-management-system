const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, 'data.sqlite');

const db = new sqlite3.Database(dbPath);

function init() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      email TEXT,
      identifier TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER,
      amount REAL,
      interestRate REAL,
      termMonths INTEGER,
      status TEXT,
      appliedAt TEXT,
      approvedBy INTEGER,
      approvedAt TEXT,
      disbursedAt TEXT,
      balance REAL,
      FOREIGN KEY(clientId) REFERENCES clients(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS repayments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loanId INTEGER,
      amount REAL,
      date TEXT,
      FOREIGN KEY(loanId) REFERENCES loans(id)
    )`);

    // seed an admin user if none
    db.get('SELECT COUNT(*) as cnt FROM users', (err, row) => {
      if (!err && row && row.cnt === 0) {
        db.run('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', [
          'Admin', 'admin@example.com', 'admin', 'admin'
        ]);
      }
    });
  });
}

module.exports = { db, init };
