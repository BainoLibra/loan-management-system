const pool = require('../db');

const getAuditLogs = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        a.*,
        u.name AS userName
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.userId
      ORDER BY a.createdAt DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAuditLogs };
