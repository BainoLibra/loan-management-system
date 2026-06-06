const { prisma } = require('../db');
const bcrypt = require('bcrypt');
const { logAudit } = require('../utils/hash');
const { isValidEmail, normalizeEmail, parsePositiveInt, sendServerError } = require('../utils/http');

const allowedRoles = ['admin', 'loan_officer', 'cashier', 'branch_manager', 'client'];
const allowedStatuses = ['active', 'inactive'];

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
    return sendServerError(res, err, 'List users error');
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;
    const userId = parsePositiveInt(id);
    const normalizedEmail = normalizeEmail(email);

    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
    }
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim(), email: normalizedEmail, role, status },
    });

    await logAudit(req.user.id, 'UPDATE_USER', 'user', userId);
    res.json({ updated: 1 });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return sendServerError(res, err, 'Update user error');
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const userId = parsePositiveInt(id);

    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    await logAudit(req.user.id, 'RESET_PASSWORD', 'user', userId);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return sendServerError(res, err, 'Reset user password error');
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parsePositiveInt(id);

    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await prisma.user.delete({ where: { id: userId } });
    await logAudit(req.user.id, 'DELETE_USER', 'user', userId);
    res.json({ deleted: 1 });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return sendServerError(res, err, 'Delete user error');
  }
};

module.exports = { getUsers, updateUser, resetPassword, deleteUser };
