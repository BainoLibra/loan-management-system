const { prisma } = require('../db');
const bcrypt = require('bcrypt');
const { logAudit } = require('../utils/hash');

const getUsers = async (req, res) => {
  try {
    const rows = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;

    await prisma.user.update({
      where: { id: Number(id) },
      data: { name, email, role, status },
    });

    await logAudit(req.user.id, 'UPDATE_USER', 'user', id);
    res.json({ updated: 1 });
  } catch (err) {
    if (err.code === 'P2002') {
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

    await prisma.user.update({
      where: { id: Number(id) },
      data: { password: hashed },
    });
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
    await prisma.user.delete({ where: { id: Number(id) } });
    await logAudit(req.user.id, 'DELETE_USER', 'user', id);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getUsers, updateUser, resetPassword, deleteUser };
