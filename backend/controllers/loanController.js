const pool = require('../db');
const { logAudit } = require('../utils/hash');

const getLoanById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT * FROM loans WHERE id = ?',
    [id]
  );
  return rows[0];
};

const createLoan = async (req, res) => {
  try {
    const { clientId, amount, interestRate, termMonths } = req.body;

    const createdBy = req.user.id;

    const appliedAt = new Date();
    const status = 'applied';
    const balance = amount;

    const [result] = await pool.execute(
      `INSERT INTO loans
      (clientId, amount, interestRate, termMonths, status, appliedAt, balance, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [clientId, amount, interestRate, termMonths, status, appliedAt, balance, createdBy]
    );

    await logAudit(req.user.id, 'CREATE_LOAN', 'loan', result.insertId);

    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLoans = async (req, res) => {
  try {
    let query = `
      SELECT
        l.*,
        c.name AS clientName
      FROM loans l
      LEFT JOIN clients c ON c.id = l.clientId
    `;
    let params = [];
    if (req.user.role === 'client') {
      query += ' WHERE l.clientId = ?';
      params.push(req.user.id);
    }
    query += ' ORDER BY l.createdAt DESC';

    const [rows] = await pool.execute(query, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const approveLoan = async (req, res) => {
  try {
    const id = req.params.id;
    const approvedBy = req.user.id;

    const loan = await getLoanById(id);

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'applied') return res.status(400).json({ error: 'Only applied loans can be approved' });

    const approvedAt = new Date();

    const [result] = await pool.execute(
      'UPDATE loans SET status = ?, approvedBy = ?, approvedAt = ? WHERE id = ?',
      ['approved', approvedBy, approvedAt, id]
    );

    await logAudit(req.user.id, 'APPROVE_LOAN', 'loan', id);

    res.json({ updated: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const rejectLoan = async (req, res) => {
  try {
    const id = req.params.id;

    const loan = await getLoanById(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status !== 'applied') return res.status(400).json({ error: 'Only applied loans can be rejected' });

    const [result] = await pool.execute(
      'UPDATE loans SET status = ? WHERE id = ?',
      ['rejected', id]
    );

    await logAudit(req.user.id, 'REJECT_LOAN', 'loan', id);

    res.json({ updated: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const disburseLoan = async (req, res) => {
  try {
    const id = req.params.id;

    const loan = await getLoanById(id);

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'approved') return res.status(400).json({ error: 'Loan must be approved before disbursement' });

    const disbursedAt = new Date();

    // Apply interest to balance on disbursement
    const principal = Number(loan.amount);
    const rate = Number(loan.interestRate) / 100;
    const totalWithInterest = principal + (principal * rate * loan.termMonths / 12);
    const balance = Math.round(totalWithInterest * 100) / 100;

    const [result] = await pool.execute(
      'UPDATE loans SET status = ?, disbursedAt = ?, balance = ? WHERE id = ?',
      ['disbursed', disbursedAt, balance, id]
    );

    await logAudit(req.user.id, 'DISBURSE_LOAN', 'loan', id);

    res.json({ updated: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLoanSchedule = async (req, res) => {
  try {
    const id = req.params.id;
    const loan = await getLoanById(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const principal = Number(loan.amount);
    const rate = Number(loan.interestRate) / 100 / 12; // monthly rate
    const n = loan.termMonths;

    // Calculate monthly payment (amortization formula)
    let monthlyPayment;
    if (rate === 0) {
      monthlyPayment = principal / n;
    } else {
      monthlyPayment = principal * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
    }

    const schedule = [];
    let remaining = principal;
    const startDate = loan.disbursedAt ? new Date(loan.disbursedAt) : new Date(loan.appliedAt);

    for (let i = 1; i <= n; i++) {
      const interestPortion = remaining * rate;
      const principalPortion = monthlyPayment - interestPortion;
      remaining = Math.max(0, remaining - principalPortion);

      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        month: i,
        dueDate,
        payment: Math.round(monthlyPayment * 100) / 100,
        principal: Math.round(principalPortion * 100) / 100,
        interest: Math.round(interestPortion * 100) / 100,
        balance: Math.round(remaining * 100) / 100,
      });
    }

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createLoan, getLoans, approveLoan, rejectLoan, disburseLoan, getLoanSchedule };
