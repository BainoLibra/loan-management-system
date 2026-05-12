const { prisma } = require('../db');
const { sendServerError } = require('../utils/http');

const getAuditLogs = async (req, res) => {
  try {
    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
      },
    });

    res.json(rows.map((log) => ({
      ...log,
      userName: log.user?.name || null,
    })));
  } catch (err) {
    return sendServerError(res, err, 'List audit logs error');
  }
};

module.exports = { getAuditLogs };
