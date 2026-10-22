const { prisma } = require('../db');
const { parsePositiveInt } = require('../utils/http');

const resolveOrganization = async (req, res, next) => {
  try {
    const requestedId = req.get('X-Organization-Id');
    const organizationId = requestedId ? parsePositiveInt(requestedId) : null;
    if (requestedId && !organizationId) {
      return res.status(400).json({ error: 'Invalid organization id' });
    }

    const membership = await prisma.organizationMembership.findFirst({
      where: {
        userId: req.user.id,
        status: 'active',
        ...(organizationId ? { organizationId } : {}),
        organization: { status: 'active' },
      },
      orderBy: { createdAt: 'asc' },
      include: { organization: true },
    });

    if (!membership) {
      return res.status(403).json({ error: 'No active organization membership found' });
    }

    req.organization = membership.organization;
    req.membership = membership;
    next();
  } catch (err) {
    console.error('Organization resolution error:', err.message);
    return res.status(500).json({ error: 'Failed to resolve organization access' });
  }
};

module.exports = { resolveOrganization };
