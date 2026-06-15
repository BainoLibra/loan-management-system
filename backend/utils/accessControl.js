const { prisma } = require('../db');

const getOwnedGroupIds = async (userId) => {
  const groupLogs = await prisma.auditLog.findMany({
    where: { userId, entity: 'group', action: 'CREATE_GROUP' },
    select: { entityId: true },
  });

  return groupLogs.map((log) => log.entityId).filter(Boolean);
};

const getCreatedClientIds = async (userId) => {
  const clientLogs = await prisma.auditLog.findMany({
    where: { userId, entity: 'client', action: 'CREATE_CLIENT' },
    select: { entityId: true },
  });

  return clientLogs.map((log) => log.entityId).filter(Boolean);
};

const getClientAccessWhere = async (user) => {
  if (!user) return { id: -1 };
  if (user.role === 'admin') return {};

  const [clientIds, groupIds] = await Promise.all([
    getCreatedClientIds(user.id),
    getOwnedGroupIds(user.id),
  ]);

  const or = [];
  if (clientIds.length > 0) or.push({ id: { in: clientIds } });
  if (groupIds.length > 0) or.push({ groupId: { in: groupIds } });

  return or.length > 0 ? { OR: or } : { id: -1 };
};

const canAccessClient = async (user, clientId) => {
  if (!user || !clientId) return false;
  if (user.role === 'admin') return true;

  const where = await getClientAccessWhere(user);
  const client = await prisma.client.findFirst({
    where: { id: clientId, ...where },
    select: { id: true },
  });

  return Boolean(client);
};

const canManageGroup = async (user, groupId) => {
  if (!user || !groupId) return false;
  if (user.role === 'admin') return true;

  const groupIds = await getOwnedGroupIds(user.id);
  return groupIds.includes(groupId);
};

module.exports = {
  canAccessClient,
  canManageGroup,
  getClientAccessWhere,
  getCreatedClientIds,
  getOwnedGroupIds,
};
