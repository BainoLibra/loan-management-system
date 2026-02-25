const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
// const { db, init } = require('./db');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const SECRET = 'mysecretkey';
const { authenticateToken, authorizeRole } = require('./middleware/auth');
const app = express();
const port = process.env.PORT || 4000;

// init();

app.use(cors());
app.use(bodyParser.json());

async function getLoanById(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM loans WHERE id = ?',
    [id]
  );
  return rows[0];
}

// Simple auth (prototype only)
// app.post('/api/auth/login', (req, res) => {
//   const { email, password } = req.body;
//   db.get('SELECT id,name,email,role FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
//     if (err) return res.status(500).json({ error: err.message });
//     if (!row) return res.status(401).json({ error: 'Invalid credentials' });
//     res.json({ user: row });
//   });
// });
const bcrypt = require('bcrypt');

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    res.json({ message: 'User registered successfully' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Create Token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      SECRET,
      { expiresIn: '1d' }
    );

    res.json({ 
      token, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Clients
// app.post('/api/clients', (req, res) => {
//   const { name, phone, email, identifier } = req.body;
//   db.run('INSERT INTO clients (name,phone,email,identifier) VALUES (?,?,?,?)', [name, phone, email, identifier], function(err) {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json({ id: this.lastID });
//   });
// });

// app.get('/api/clients', (req, res) => {
//   db.all('SELECT * FROM clients', (err, rows) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(rows);
//   });
// });
// create client
app.post('/api/clients', authenticateToken, authorizeRole('admin', 'loan_officer'), async (req, res) => {
  try {
    const { name, phone, email, identifier } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO clients (name, phone, email, identifier) VALUES (?, ?, ?, ?)',
      [name, phone, email, identifier]
    );

    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get clients
app.get('/api/clients', authenticateToken, authorizeRole('admin', 'loan_officer'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM clients');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Loans: apply
// app.post('/api/loans', (req, res) => {
//   console.log(req.body);
//   const { clientId, amount, interestRate, termMonths } = req.body;
//   const appliedAt = new Date().toISOString();
//   db.run('INSERT INTO loans (clientId,amount,interestRate,termMonths,status,appliedAt,balance) VALUES (?,?,?,?,?,?,?)',
//     [clientId, amount, interestRate, termMonths, 'applied', appliedAt, amount], function(err) {
//       if (err) return res.status(500).json({ error: err.message });
//       res.json({ id: this.lastID });
//     });
// });

app.post('/api/loans', authenticateToken, authorizeRole('admin', 'loan_officer'), async (req, res) => {
  try {
    const { clientId, amount, interestRate, termMonths } = req.body;

    const createdBy = req.user.id;

    const appliedAt = new Date();
    const status = 'applied';
    const balance = amount;

    const [result] = await pool.execute(
      `INSERT INTO loans 
      (clientId, amount, interestRate, termMonths, status, appliedAt, balance)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [clientId, amount, interestRate, termMonths, status, appliedAt, balance]
    );

    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/loans', authenticateToken, authorizeRole('admin', 'loan_officer'), async (req, res) =>{
  try {
    let query = (`
      SELECT 
        l.*, 
        c.name AS clientName
      FROM loans l
      LEFT JOIN clients c ON c.id = l.clientId
    `);
    let params =[];
    // Client sees only their loans
    if (req.user.role === 'client') {
      query += ' WHERE l.clientId = ?';
      params.push(req.user.id);
    }

    const [rows] = await pool.execute(query, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}); 
//   {
//   pool.query('SELECT l.*, c.name as clientName FROM loans l LEFT JOIN clients c ON c.id = l.clientId', (err, rows) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(rows);
//   });
// });

// Approve
// app.post('/api/loans/:id/approve', (req, res) => {
//   const id = req.params.id;
//   const { approvedBy } = req.body;
//   const approvedAt = new Date().toISOString();
//   db.run('UPDATE loans SET status = ?, approvedBy = ?, approvedAt = ? WHERE id = ?', ['approved', approvedBy, approvedAt, id], function(err) {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json({ updated: this.changes });
//   });
// });

// Approve Loan
app.post('/api/loans/:id/approve', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    console.log("USER:", req.user);
    console.log("PARAM ID:", req.params.id);
    const id = req.params.id;
    // const { approvedBy } = req.body;
    const approvedBy = req.user.id;

    const loan = await getLoanById(id);

    if (!loan)
      return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'applied')
      return res.status(400).json({ error: 'Only applied loans can be approved' });

      const approvedAt = new Date();
      console.log("DEBUG VALUES:", {
      id,
      approvedBy,
      approvedAt: approvedAt
      });

    const [result] = await pool.execute(
      'UPDATE loans SET status = ?, approvedBy = ?, approvedAt = ? WHERE id = ?',
      ['approved', approvedBy, approvedAt, id]
    );

    res.json({ updated: result.affectedRows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// Disburse
// app.post('/api/loans/:id/disburse', (req, res) => {
//   const id = req.params.id;
//   const disbursedAt = new Date().toISOString();
//   db.run('UPDATE loans SET status = ?, disbursedAt = ? WHERE id = ?', ['disbursed', disbursedAt, id], function(err) {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json({ updated: this.changes });
//   });
// });

// Disburse Loan
app.post('/api/loans/:id/disburse', authenticateToken, authorizeRole('admin', 'cashier'), async (req, res) => {
  try {
    const id = req.params.id;

    const loan = await getLoanById(id);

    if (!loan)
      return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'approved')
      return res.status(400).json({ error: 'Loan must be approved before disbursement' });

    const disbursedAt = new Date();

    const [result] = await pool.execute(
      'UPDATE loans SET status = ?, disbursedAt = ? WHERE id = ?',
      ['disbursed', disbursedAt, id]
    );

    res.json({ updated: result.affectedRows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// Record repayment
// app.post('/api/loans/:id/repay', (req, res) => {
//   const loanId = req.params.id;
//   const { amount } = req.body;
//   const date = new Date().toISOString();
//   db.run('INSERT INTO repayments (loanId,amount,date) VALUES (?,?,?)', [loanId, amount, date], function(err) {
//     if (err) return res.status(500).json({ error: err.message });
//     // reduce loan balance
//     db.run('UPDATE loans SET balance = balance - ? WHERE id = ?', [amount, loanId], function(err2) {
//       if (err2) return res.status(500).json({ error: err2.message });
//       res.json({ repaymentId: this.lastID });
//     });
//   });
// });

// Record repayment
app.post('/api/loans/:id/repay', authenticateToken, authorizeRole('admin', 'cashier'), async (req, res) => {
  try {
    const loanId = req.params.id;
    const { amount } = req.body;

    const paidBy = req.user.id;

    const loan = await getLoanById(loanId);

    if (!loan)
      return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'disbursed')
      return res.status(400).json({ error: 'Loan must be disbursed before repayment' });

    if (amount <= 0)
      return res.status(400).json({ error: 'Invalid repayment amount' });

    if (amount > loan.balance)
      return res.status(400).json({ error: 'Repayment exceeds remaining balance' });

    const date = new Date();

    // Insert repayment
    const [repaymentResult] = await pool.execute(
      'INSERT INTO repayments (loanId, amount, date) VALUES (?, ?, ?)',
      [loanId, amount, date]
    );

    // Update balance
    await pool.execute(
      'UPDATE loans SET balance = balance - ? WHERE id = ?',
      [amount, loanId]
    );

    // Close loan if fully paid
    await pool.execute(
      'UPDATE loans SET status = ? WHERE id = ? AND balance - ? <= 0',
      ['closed', loanId, amount]
    );

    res.json({ repaymentId: repaymentResult.insertId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Repayments list for loan
// app.get('/api/loans/:id/repayments', (req, res) => {
//   const loanId = req.params.id;
//   db.all('SELECT * FROM repayments WHERE loanId = ?', [loanId], (err, rows) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(rows);
//   });
// });

// Repayments list for loan
app.get('/api/loans/:id/repayments', authenticateToken, authorizeRole('admin', 'loan_officer'), async (req, res) => {
  try {
    const loanId = req.params.id;

    const [rows] = await pool.execute(
      'SELECT * FROM repayments WHERE loanId = ?',
      [loanId]
    );

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete loan
app.delete('/api/loans/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;

    const loan = await getLoanById(id);

    if (!loan)
      return res.status(404).json({ error: 'Loan not found' });

    if (loan.status === 'disbursed')
      return res.status(400).json({ error: 'Cannot delete disbursed loan' });

    const [result] = await pool.execute(
      'DELETE FROM loans WHERE id = ?',
      [id]
    );

    res.json({ deleted: result.affectedRows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple aging report
// app.get('/api/reports/aging', (req, res) => {
//   const sql = `SELECT l.id, c.name as clientName, l.amount, l.balance, l.disbursedAt
//     FROM loans l LEFT JOIN clients c ON c.id = l.clientId WHERE l.status = 'disbursed'`;
//   db.all(sql, [], (err, rows) => {
//     if (err) return res.status(500).json({ error: err.message });
//     const now = new Date();
//     const result = rows.map(r => {
//       const disb = r.disbursedAt ? new Date(r.disbursedAt) : null;
//       let days = disb ? Math.floor((now - disb) / (1000*60*60*24)) : null;
//       return { ...r, daysOutstanding: days, isArrears: r.balance > 0 && days > 30 };
//     });
//     res.json(result);
//   });
// });

// Simple aging report
app.get('/api/reports/aging', authenticateToken, authorizeRole('admin', 'cashier', 'loan_officer'), async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        l.id,
        c.name AS clientName,
        l.amount,
        l.balance,
        l.termMonths,
        l.disbursedAt,
        l.status
      FROM loans l
      LEFT JOIN clients c ON c.id = l.clientId
      WHERE l.status = 'disbursed'
    `);

    const now = new Date();

    const result = rows.map(loan => {
      if (!loan.disbursedAt) return null;

      const disbursedDate = new Date(loan.disbursedAt);

      // Expected end date
      const dueDate = new Date(disbursedDate);
      dueDate.setMonth(dueDate.getMonth() + loan.termMonths);

      // Days overdue
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

      let bucket = 'CURRENT';

      if (daysOverdue > 30 && daysOverdue <= 60) bucket = 'PAR 30';
      else if (daysOverdue > 60 && daysOverdue <= 90) bucket = 'PAR 60';
      else if (daysOverdue > 90) bucket = 'PAR 90';

      return {
        ...loan,
        dueDate,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        bucket,
        inArrears: daysOverdue > 0 && loan.balance > 0
      };
    });

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
