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

const disburseLoan = async (req, res) => {
  try {
    const id = req.params.id;

    const loan = await getLoanById(id);

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'approved') return res.status(400).json({ error: 'Loan must be approved before disbursement' });

    const disbursedAt = new Date();

    const [result] = await pool.execute(
      'UPDATE loans SET status = ?, disbursedAt = ? WHERE id = ?',
      ['disbursed', disbursedAt, id]
    );

    await logAudit(req.user.id, 'DISBURSE_LOAN', 'loan', id);

    res.json({ updated: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createLoan, getLoans, approveLoan, disburseLoan };
