const pool = require('../db');
const { logAudit } = require('../utils/hash');

const createClient = async (req, res) => {
  try {
    const { name, phone, email, identifier } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO clients (name, phone, email, identifier) VALUES (?, ?, ?, ?)',
      [name, phone, email, identifier]
    );

    await logAudit(req.user.id, 'CREATE_CLIENT', 'client', result.insertId);

    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getClients = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM clients');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createClient, getClients };
