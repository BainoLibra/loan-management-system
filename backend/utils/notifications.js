const sendEmail = require('./sendEmail');

const queueNotification = async (data) => {
  try {
    return await data.prisma.notification.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId || null,
        clientId: data.clientId || null,
        channel: 'EMAIL',
        eventType: data.eventType,
        subject: data.subject,
        body: data.body,
        recipientEmail: data.recipientEmail || null,
      },
    });
  } catch (error) {
    console.error('Notification queue error:', error.message);
    return null;
  }
};

const deliverNotification = async (prisma, notification) => {
  try {
    if (notification.channel !== 'EMAIL' || !notification.recipientEmail) {
      throw new Error('Notification email recipient is missing');
    }
    await sendEmail({ to: notification.recipientEmail, subject: notification.subject, text: notification.body });
    return prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'SENT', attempts: { increment: 1 }, sentAt: new Date(), lastError: null },
    });
  } catch (error) {
    return prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'FAILED', attempts: { increment: 1 }, lastError: error.message.slice(0, 500) },
    });
  }
};

module.exports = { queueNotification, deliverNotification };