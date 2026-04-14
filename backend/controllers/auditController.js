const { prisma } = require('../db');

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
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAuditLogs };
