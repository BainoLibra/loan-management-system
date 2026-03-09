const pool = require('../db');
const { logAudit } = require('../utils/hash');

const getLoanById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT * FROM loans WHERE id = ?',
    [id]
  );
  return rows[0];
};

const repayLoan = async (req, res) => {
  try {
    const loanId = req.params.loanId;
    const { amount } = req.body;

    const paidBy = req.user.id;

    const loan = await getLoanById(loanId);

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'disbursed') return res.status(400).json({ error: 'Loan must be disbursed before repayment' });

    if (amount <= 0) return res.status(400).json({ error: 'Invalid repayment amount' });

    if (amount > loan.balance) return res.status(400).json({ error: 'Repayment exceeds remaining balance' });

    const date = new Date();

    // Insert repayment
    const [repaymentResult] = await pool.execute(
      'INSERT INTO repayments (loanId, amount, date, paidBy) VALUES (?, ?, ?, ?)',
      [loanId, amount, date, paidBy]
    );

    // Update balance
    await pool.execute(
      'UPDATE loans SET balance = balance - ? WHERE id = ?',
      [amount, loanId]
    );

    // Close loan if fully paid
    await pool.execute(
      'UPDATE loans SET status = ? WHERE id = ? AND balance <= 0',
      ['closed', loanId]
    );

    await logAudit(req.user.id, 'REPAY_LOAN', 'loan', loanId);

    res.json({ repaymentId: repaymentResult.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRepayments = async (req, res) => {
  try {
    const loanId = req.params.loanId;

    const [rows] = await pool.execute(
      'SELECT * FROM repayments WHERE loanId = ? ORDER BY date DESC',
      [loanId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { repayLoan, getRepayments };
