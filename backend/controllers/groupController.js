const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');
const { canManageGroup } = require('../utils/accessControl');
const { optionalTrimmedString, parsePositiveInt, sendServerError } = require('../utils/http');

const meetingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const normalizeMeetingDay = (value) => {
  if (value === undefined || value === null || value === '') return 'Monday';
  const trimmed = String(value).trim();
  const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  return normalized;
};

const createGroup = async (req, res) => {
  try {
    const { name, description, meetingDay } = req.body;
    const groupName = optionalTrimmedString(name, 100);
    const groupDescription = optionalTrimmedString(description, 500);
    const normalizedMeetingDay = normalizeMeetingDay(meetingDay);

    if (!groupName) {
      return res.status(400).json({ error: 'Group name is required.' });
    }
    if (description && !groupDescription) {
      return res.status(400).json({ error: 'Description must be under 500 characters.' });
    }
    if (!meetingDays.includes(normalizedMeetingDay)) {
      return res.status(400).json({ error: 'Meeting day must be one of Monday, Tuesday, Wednesday, Thursday, or Friday.' });
    }

    const group = await prisma.group.create({
      data: { name: groupName, description: groupDescription, meetingDay: normalizedMeetingDay },
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
    const { name, description, meetingDay } = req.body;
    const groupId = parsePositiveInt(id);
    const groupName = optionalTrimmedString(name, 100);
    const groupDescription = optionalTrimmedString(description, 500);
    const normalizedMeetingDay = normalizeMeetingDay(meetingDay);

    if (!groupId) return res.status(400).json({ error: 'Invalid group id' });
    if (!groupName) {
      return res.status(400).json({ error: 'Group name is required.' });
    }
    if (description && !groupDescription) {
      return res.status(400).json({ error: 'Description must be under 500 characters.' });
    }
    if (!meetingDays.includes(normalizedMeetingDay)) {
      return res.status(400).json({ error: 'Meeting day must be one of Monday, Tuesday, Wednesday, Thursday, or Friday.' });
    }

    // Only admins or group creator may update group details
    if (!await canManageGroup(req.user, groupId)) {
      return res.status(403).json({ error: 'Cannot update a group you do not manage.' });
    }

    await prisma.group.update({
      where: { id: groupId },
      data: { name: groupName, description: groupDescription, meetingDay: normalizedMeetingDay },
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
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete groups.' });
    }

    // Check if group has clients
    const clients = await prisma.client.count({ where: { groupId } });
    if (clients > 0) {
      return res.status(400).json({ error: 'Cannot delete group with existing clients' });
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

    // Only admins or group creator may modify membership
    if (!await canManageGroup(req.user, groupId)) {
      return res.status(403).json({ error: 'Cannot modify members of a group you do not manage.' });
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

const getGroupCollectionSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const groupId = parsePositiveInt(id);
    if (!groupId) return res.status(400).json({ error: 'Invalid group id' });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        clients: {
          where: { status: 'active' },
          include: {
            loans: {
              where: { status: 'disbursed' },
              include: {
                schedules: {
                  where: { status: { in: ['pending', 'overdue'] } },
                  orderBy: { dueDate: 'asc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });

    let groupTotalExpected = 0;
    let totalActiveLoans = 0;

    const collectionSheet = group.clients.map((client) => {
      const activeLoan = client.loans[0] || null;
      let expectedInstallment = 0;
      let scheduleId = null;

      if (activeLoan) {
        totalActiveLoans += 1;
        const currentSchedule = activeLoan.schedules[0] || null;
        if (currentSchedule) {
          expectedInstallment = Math.max(0, Number(currentSchedule.payment) - Number(currentSchedule.paidAmount || 0));
          scheduleId = currentSchedule.id;
        } else {
          expectedInstallment = Math.min(Number(activeLoan.balance), Number(activeLoan.amount) / Math.max(1, activeLoan.termMonths));
        }
        groupTotalExpected += expectedInstallment;
      }

      return {
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`.trim(),
        phone: client.phone || '—',
        hasActiveLoan: !!activeLoan,
        loanId: activeLoan?.id || null,
        loanBalance: activeLoan ? Number(activeLoan.balance) : 0,
        expectedInstallment,
        scheduleId,
      };
    });

    res.json({
      groupId: group.id,
      groupName: group.name,
      description: group.description,
      totalMembers: group.clients.length,
      totalActiveLoans,
      groupTotalExpected,
      members: collectionSheet,
    });
  } catch (err) {
    return sendServerError(res, err, 'Get group collection sheet error');
  }
};

module.exports = { createGroup, getGroups, getGroupById, updateGroup, deleteGroup, updateGroupMembers, getGroupCollectionSheet };
