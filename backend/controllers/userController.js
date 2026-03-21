const pool = require('../db');
const bcrypt = require('bcrypt');
const { logAudit } = require('../utils/hash');

const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, status, createdAt FROM users ORDER BY createdAt DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;

    const [result] = await pool.execute(
      'UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?',
      [name, email, role, status, id]
    );

    await logAudit(req.user.id, 'UPDATE_USER', 'user', id);
    res.json({ updated: result.affectedRows });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, id]);
    await logAudit(req.user.id, 'RESET_PASSWORD', 'user', id);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    await logAudit(req.user.id, 'DELETE_USER', 'user', id);
    res.json({ deleted: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getUsers, updateUser, resetPassword, deleteUser };
