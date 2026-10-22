const { prisma } = require('../db');
const { deliverNotification } = require('../utils/notifications');
const { parsePositiveInt, sendServerError } = require('../utils/http');

const getNotifications = async (req, res) => {
  try {
    const where = req.user.role === 'admin'
      ? { organizationId: req.organization.id }
      : { organizationId: req.organization.id, userId: req.user.id };
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(notifications);
  } catch (err) {
    return sendServerError(res, err, 'List notifications error');
  }
};

const retryNotification = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid notification id' });
    const notification = await prisma.notification.findFirst({
      where: { id, organizationId: req.organization.id },
    });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (notification.status === 'SENT') return res.status(409).json({ error: 'Notification has already been sent' });

    const delivered = await deliverNotification(prisma, notification);
    res.json(delivered);
  } catch (err) {
    return sendServerError(res, err, 'Retry notification error');
  }
};

module.exports = { getNotifications, retryNotification };
