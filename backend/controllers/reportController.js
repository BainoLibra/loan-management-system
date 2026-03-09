const pool = require('../db');

const getAgingReport = async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAgingReport };
