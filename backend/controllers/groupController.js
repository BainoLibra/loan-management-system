const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');

const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    const group = await prisma.group.create({
      data: { name: name.trim(), description },
    });

    await logAudit(req.user.id, 'CREATE_GROUP', 'group', group.id);

    res.json({ id: group.id });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Group name already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
};

const getGroups = async (req, res) => {
  try {
    const rows = await prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await prisma.group.findUnique({
      where: { id: Number(id) },
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });

    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    await prisma.group.update({
      where: { id: Number(id) },
      data: { name: name.trim(), description },
    });

    await logAudit(req.user.id, 'UPDATE_GROUP', 'group', id);
    res.json({ updated: 1 });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Group name already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if group has clients
    const clients = await prisma.client.count({ where: { groupId: Number(id) } });
    if (clients > 0) {
      return res.status(400).json({ error: 'Cannot delete group with existing clients' });
    }

    await prisma.group.delete({ where: { id: Number(id) } });
    await logAudit(req.user.id, 'DELETE_GROUP', 'group', id);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createGroup, getGroups, getGroupById, updateGroup, deleteGroup };
