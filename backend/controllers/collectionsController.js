const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');
const { optionalTrimmedString, parsePositiveInt, sendServerError } = require('../utils/http');
const { queueNotification } = require('../utils/notifications');

const activityTypes = ['CALL', 'SMS', 'VISIT', 'PROMISE_TO_PAY', 'ESCALATION', 'NOTE'];

const getOverdueLoans = async (req, res) => {
  try {
    const now = new Date();
    const schedules = await prisma.schedule.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: ['pending', 'overdue'] },
        loan: { organizationId: req.organization.id, status: 'disbursed' },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        loan: { include: { client: { select: { firstName: true, lastName: true, phone: true } } } },
      },
    });
    res.json(schedules.map((schedule) => ({
      scheduleId: schedule.id,
      loanId: schedule.loanId,
      client: schedule.loan.client,
      amountDue: Math.max(0, Number(schedule.payment) - Number(schedule.paidAmount || 0)),
      daysPastDue: Math.max(1, Math.floor((now - new Date(schedule.dueDate)) / 86400000)),
      dueDate: schedule.dueDate,
      status: schedule.status,
    })));
  } catch (err) {
    return sendServerError(res, err, 'List overdue loans error');
  }
};

const createCollectionActivity = async (req, res) => {
  try {
    const loanId = parsePositiveInt(req.params.loanId);
    const { activityType, outcome, notes, promiseDate, assignedTo } = req.body || {};
    const parsedAssignedTo = assignedTo ? parsePositiveInt(assignedTo) : req.user.id;
    if (!loanId || !activityTypes.includes(activityType)) return res.status(400).json({ error: 'Valid loanId and activityType are required' });
    const sanitizedNotes = optionalTrimmedString(notes, 1000);
    const sanitizedOutcome = optionalTrimmedString(outcome, 200);
    if (notes && !sanitizedNotes) return res.status(400).json({ error: 'Notes must be under 1,000 characters' });

    const loan = await prisma.loan.findFirst({ where: { id: loanId, organizationId: req.organization.id } });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    const membership = await prisma.organizationMembership.findFirst({
      where: { organizationId: req.organization.id, userId: parsedAssignedTo, status: 'active' },
    });
    if (!membership) return res.status(400).json({ error: 'Assigned user is not an active organization member' });

    const activity = await prisma.collectionActivity.create({
      data: {
        organizationId: req.organization.id,
        loanId,
        createdBy: req.user.id,
        assignedTo: parsedAssignedTo,
        activityType,
        outcome: sanitizedOutcome,
        notes: sanitizedNotes,
        promiseDate: promiseDate ? new Date(promiseDate) : null,
      },
    });
    await logAudit(req.user.id, 'CREATE_COLLECTION_ACTIVITY', 'collection_activity', activity.id);
    const client = await prisma.client.findFirst({ where: { loans: { some: { id: loanId, organizationId: req.organization.id } }, organizationId: req.organization.id }, select: { id: true, email: true } });
    if (client?.email && activityType === 'PROMISE_TO_PAY') await queueNotification({
      prisma,
      organizationId: req.organization.id,
      clientId: client.id,
      recipientEmail: client.email,
      eventType: 'PROMISE_TO_PAY_RECORDED',
      subject: `Promise to pay recorded for loan ${loanId}`,
      body: `Your promise to pay for loan ${loanId} has been recorded.`,
    });
    res.status(201).json(activity);
  } catch (err) {
    return sendServerError(res, err, 'Create collection activity error');
  }
};

const getLoanCollectionActivities = async (req, res) => {
  try {
    const loanId = parsePositiveInt(req.params.loanId);
    if (!loanId) return res.status(400).json({ error: 'Invalid loan id' });
    const activities = await prisma.collectionActivity.findMany({
      where: { loanId, organizationId: req.organization.id },
      orderBy: { createdAt: 'desc' },
      include: { createdByUser: { select: { name: true } }, assignedToUser: { select: { name: true } } },
    });
    res.json(activities);
  } catch (err) {
    return sendServerError(res, err, 'List collection activities error');
  }
};

module.exports = { getOverdueLoans, createCollectionActivity, getLoanCollectionActivities };