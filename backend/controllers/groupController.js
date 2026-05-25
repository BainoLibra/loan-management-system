const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');
const { optionalTrimmedString, parsePositiveInt, sendServerError } = require('../utils/http');

const createGroup = async (req, res) => {
  try {
    // Admins are not allowed to create groups — groups are created by loan officers only
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Admins are not permitted to create groups.' });
    }
    const { name, description } = req.body;
    const groupName = optionalTrimmedString(name, 100);
    const groupDescription = optionalTrimmedString(description, 500);

    if (!groupName) {
      return res.status(400).json({ error: 'Group name is required.' });
    }
    if (description && !groupDescription) {
      return res.status(400).json({ error: 'Description must be under 500 characters.' });
    }

    const group = await prisma.group.create({
      data: { name: groupName, description: groupDescription },
    });

    await logAudit(req.user.id, 'CREATE_GROUP', 'group', group.id);

    res.json({ id: group.id });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Group name already exists.' });
    }
    return sendServerError(res, err, 'Create group error');
  }
};

const getGroups = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const rows = await prisma.group.findMany({ orderBy: { createdAt: 'desc' } });
      return res.json(rows);
    }

    // Non-admin: only groups the user created (based on audit logs)
    const logs = await prisma.auditLog.findMany({
      where: { userId: req.user.id, entity: 'group', action: 'CREATE_GROUP' },
    });
    const groupIds = logs.map((l) => l.entityId).filter(Boolean);
    if (groupIds.length === 0) return res.json([]);

    const rows = await prisma.group.findMany({
      where: { id: { in: groupIds } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (err) {
    return sendServerError(res, err, 'List groups error');
  }
};

const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const groupId = parsePositiveInt(id);
    if (!groupId) return res.status(400).json({ error: 'Invalid group id' });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { clients: true },
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (req.user.role !== 'admin') {
      const createdLog = await prisma.auditLog.findFirst({
        where: { userId: req.user.id, entity: 'group', action: 'CREATE_GROUP', entityId: groupId },
      });
      if (!createdLog) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    res.json(group);
  } catch (err) {
    return sendServerError(res, err, 'Get group error');
  }
};

const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const groupId = parsePositiveInt(id);
    const groupName = optionalTrimmedString(name, 100);
    const groupDescription = optionalTrimmedString(description, 500);

    if (!groupId) return res.status(400).json({ error: 'Invalid group id' });
    if (!groupName) {
      return res.status(400).json({ error: 'Group name is required.' });
    }
    if (description && !groupDescription) {
      return res.status(400).json({ error: 'Description must be under 500 characters.' });
    }

    // Only admins may update group details
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update groups.' });
    }

    await prisma.group.update({
      where: { id: groupId },
      data: { name: groupName, description: groupDescription },
    });

    await logAudit(req.user.id, 'UPDATE_GROUP', 'group', groupId);
    res.json({ updated: 1 });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Group name already exists.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Group not found' });
    }
    return sendServerError(res, err, 'Update group error');
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const groupId = parsePositiveInt(id);

    if (!groupId) return res.status(400).json({ error: 'Invalid group id' });

    // Check if group has clients
    const clients = await prisma.client.count({ where: { groupId } });
    if (clients > 0) {
      return res.status(400).json({ error: 'Cannot delete group with existing clients' });
    }

    // Only admins may delete groups
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete groups.' });
    }

    await prisma.group.delete({ where: { id: groupId } });
    await logAudit(req.user.id, 'DELETE_GROUP', 'group', groupId);
    res.json({ deleted: 1 });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Group not found' });
    }
    return sendServerError(res, err, 'Delete group error');
  }
};

const updateGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientIds } = req.body;
    const groupId = parsePositiveInt(id);

    if (!groupId) return res.status(400).json({ error: 'Invalid group id' });

    if (!Array.isArray(clientIds)) {
      return res.status(400).json({ error: 'clientIds must be an array' });
    }
    const parsedClientIds = clientIds.map(parsePositiveInt);
    if (parsedClientIds.some((clientId) => !clientId)) {
      return res.status(400).json({ error: 'clientIds must contain valid client ids' });
    }
    // Verify group exists first
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Only the user who created the group (owner) may modify membership, except admins.
    // Only admins may modify group membership via this endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can modify group membership.' });
    }

    // Ensure all client ids exist
    const existingClients = await prisma.client.findMany({ where: { id: { in: parsedClientIds } } });
    if (existingClients.length !== parsedClientIds.length) {
      return res.status(404).json({ error: 'One or more clients not found' });
    }

    // Update membership by setting groupId on the provided clients and clearing it for others
    await prisma.$transaction([
      // Clear groupId for clients currently in this group but not in the new list
      prisma.client.updateMany({ where: { groupId, id: { notIn: parsedClientIds } }, data: { groupId: null } }),
      // Assign this groupId to the provided clients
      prisma.client.updateMany({ where: { id: { in: parsedClientIds } }, data: { groupId } }),
    ]);

    const updated = await prisma.group.findUnique({ where: { id: groupId }, include: { clients: true } });
    await logAudit(req.user.id, 'UPDATE_GROUP_MEMBERS', 'group', groupId);
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Group or client not found' });
    }
    return sendServerError(res, err, 'Update group members error');
  }
};

module.exports = { createGroup, getGroups, getGroupById, updateGroup, deleteGroup, updateGroupMembers };
