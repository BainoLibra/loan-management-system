const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { db, init } = require('./db');
const app = express();
const port = process.env.PORT || 4000;

init();

app.use(cors());
app.use(bodyParser.json());

// Simple auth (prototype only)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT id,name,email,role FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ user: row });
  });
});

// Clients
app.post('/api/clients', (req, res) => {
  const { name, phone, email, identifier } = req.body;
  db.run('INSERT INTO clients (name,phone,email,identifier) VALUES (?,?,?,?)', [name, phone, email, identifier], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Loans: apply
app.post('/api/loans', (req, res) => {
  console.log(req.body);
  const { clientId, amount, interestRate, termMonths } = req.body;
  const appliedAt = new Date().toISOString();
  db.run('INSERT INTO loans (clientId,amount,interestRate,termMonths,status,appliedAt,balance) VALUES (?,?,?,?,?,?,?)',
    [clientId, amount, interestRate, termMonths, 'applied', appliedAt, amount], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.get('/api/loans', (req, res) => {
  db.all('SELECT l.*, c.name as clientName FROM loans l LEFT JOIN clients c ON c.id = l.clientId', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Approve
app.post('/api/loans/:id/approve', (req, res) => {
  const id = req.params.id;
  const { approvedBy } = req.body;
  const approvedAt = new Date().toISOString();
  db.run('UPDATE loans SET status = ?, approvedBy = ?, approvedAt = ? WHERE id = ?', ['approved', approvedBy, approvedAt, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// Disburse
app.post('/api/loans/:id/disburse', (req, res) => {
  const id = req.params.id;
  const disbursedAt = new Date().toISOString();
  db.run('UPDATE loans SET status = ?, disbursedAt = ? WHERE id = ?', ['disbursed', disbursedAt, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// Record repayment
app.post('/api/loans/:id/repay', (req, res) => {
  const loanId = req.params.id;
  const { amount } = req.body;
  const date = new Date().toISOString();
  db.run('INSERT INTO repayments (loanId,amount,date) VALUES (?,?,?)', [loanId, amount, date], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    // reduce loan balance
    db.run('UPDATE loans SET balance = balance - ? WHERE id = ?', [amount, loanId], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ repaymentId: this.lastID });
    });
  });
});

// Repayments list for loan
app.get('/api/loans/:id/repayments', (req, res) => {
  const loanId = req.params.id;
  db.all('SELECT * FROM repayments WHERE loanId = ?', [loanId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Simple aging report
app.get('/api/reports/aging', (req, res) => {
  const sql = `SELECT l.id, c.name as clientName, l.amount, l.balance, l.disbursedAt
    FROM loans l LEFT JOIN clients c ON c.id = l.clientId WHERE l.status = 'disbursed'`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const now = new Date();
    const result = rows.map(r => {
      const disb = r.disbursedAt ? new Date(r.disbursedAt) : null;
      let days = disb ? Math.floor((now - disb) / (1000*60*60*24)) : null;
      return { ...r, daysOutstanding: days, isArrears: r.balance > 0 && days > 30 };
    });
    res.json(result);
  });
});

app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
