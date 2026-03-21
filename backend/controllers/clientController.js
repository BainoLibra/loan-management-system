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
    const [rows] = await pool.execute('SELECT * FROM clients ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM clients WHERE id = ?', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Client not found' });

    // Get client's loans
    const [loans] = await pool.execute(
      'SELECT * FROM loans WHERE clientId = ? ORDER BY createdAt DESC',
      [id]
    );

    res.json({ ...rows[0], loans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, identifier } = req.body;

    const [result] = await pool.execute(
      'UPDATE clients SET name = ?, phone = ?, email = ?, identifier = ? WHERE id = ?',
      [name, phone, email, identifier, id]
    );

    await logAudit(req.user.id, 'UPDATE_CLIENT', 'client', id);
    res.json({ updated: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client has loans
    const [loans] = await pool.execute('SELECT COUNT(*) as cnt FROM loans WHERE clientId = ?', [id]);
    if (loans[0].cnt > 0) {
      return res.status(400).json({ error: 'Cannot delete client with existing loans' });
    }

    const [result] = await pool.execute('DELETE FROM clients WHERE id = ?', [id]);
    await logAudit(req.user.id, 'DELETE_CLIENT', 'client', id);
    res.json({ deleted: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createClient, getClients, getClientById, updateClient, deleteClient };
