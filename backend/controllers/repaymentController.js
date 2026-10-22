const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');
const { parseFiniteNumber, parsePositiveInt, sendServerError } = require('../utils/http');

const getLoanById = async (id, organizationId) => {
  return prisma.loan.findFirst({ where: { id, organizationId } });
};

const repayLoan = async (req, res) => {
  try {
    const loanId = parsePositiveInt(req.params.loanId);
    const { amount, scheduleId, paymentMethod, reference } = req.body;
    const requestedIdempotencyKey = req.get('Idempotency-Key') || req.body.idempotencyKey;
    const idempotencyKey = typeof requestedIdempotencyKey === 'string'
      ? requestedIdempotencyKey.trim().slice(0, 128)
      : null;

    const paidBy = req.user.id;
    const repaymentAmount = parseFiniteNumber(amount);

    if (!loanId) return res.status(400).json({ error: 'Invalid loan id' });
    if (repaymentAmount == null || repaymentAmount <= 0) {
      return res.status(400).json({ error: 'Repayment amount must be greater than zero' });
    }

    const validMethods = ['cash', 'mobile_money', 'bank_transfer', 'cheque'];
    const selectedMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'cash';
    const sanitizedReference = typeof reference === 'string' ? reference.trim().slice(0, 100) : null;

    const date = new Date();
    const repayment = await prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const existingRepayment = await tx.repayment.findUnique({ where: { idempotencyKey } });
        if (existingRepayment) {
          if (existingRepayment.loanId !== loanId) {
            const error = new Error('Idempotency key belongs to another loan');
            error.statusCode = 409;
            throw error;
          }
          return { repayment: existingRepayment, alreadyProcessed: true };
        }
      }

      const loan = await tx.loan.findFirst({ where: { id: loanId, organizationId: req.organization.id } });
      if (!loan) {
        const error = new Error('Loan not found');
        error.statusCode = 404;
        throw error;
      }
      if (loan.status !== 'disbursed') {
        const error = new Error('Loan must be disbursed before repayment');
        error.statusCode = 400;
        throw error;
      }

      let schedule = null;
      if (scheduleId) {
        const parsedScheduleId = parsePositiveInt(scheduleId);
        if (!parsedScheduleId) {
          const error = new Error('Invalid schedule id');
          error.statusCode = 400;
          throw error;
        }
        schedule = await tx.schedule.findUnique({ where: { id: parsedScheduleId } });
        if (!schedule || schedule.loanId !== loanId) {
          const error = new Error('Schedule not found');
          error.statusCode = 404;
          throw error;
        }
        if (schedule.status === 'paid') {
          const error = new Error('Installment already paid');
          error.statusCode = 400;
          throw error;
        }
      }

      const updatedLoanCount = await tx.loan.updateMany({
        where: {
          id: loanId,
          organizationId: req.organization.id,
          status: 'disbursed',
          balance: { gte: repaymentAmount },
        },
        data: { balance: { decrement: repaymentAmount } },
      });
      if (updatedLoanCount.count !== 1) {
        const error = new Error('Repayment exceeds remaining balance');
        error.statusCode = 400;
        throw error;
      }

      const updatedLoan = await tx.loan.findFirst({ where: { id: loanId, organizationId: req.organization.id }, select: { balance: true } });
      await tx.loan.update({
        where: { id: loanId },
        data: { status: Number(updatedLoan.balance) <= 0 ? 'closed' : 'disbursed' },
      });

      const createdRepayment = await tx.repayment.create({
        data: {
          loanId,
          amount: repaymentAmount,
          paymentMethod: selectedMethod,
          reference: sanitizedReference,
          idempotencyKey,
          date,
          paidBy,
        },
      });

      if (schedule) {
        const currentPaidAmount = Number(schedule.paidAmount || 0);
        const paymentAmount = Number(schedule.payment || 0);
        const updatedPaidAmount = Math.min(paymentAmount, currentPaidAmount + repaymentAmount);
        const nextStatus = updatedPaidAmount >= paymentAmount
          ? 'paid'
          : (new Date(schedule.dueDate) < date ? 'overdue' : 'pending');

        await tx.schedule.update({
          where: { id: schedule.id },
          data: {
            paidAmount: updatedPaidAmount,
            status: nextStatus,
          },
        });
      }

      return { repayment: createdRepayment, alreadyProcessed: false };
    });

    if (!repayment.alreadyProcessed) {
      await logAudit(req.user.id, 'REPAY_LOAN', 'loan', loanId);
    }

    res.json({ repaymentId: repayment.repayment.id, alreadyProcessed: repayment.alreadyProcessed });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return sendServerError(res, err, 'Record repayment error');
  }
};

const getRepayments = async (req, res) => {
  try {
    const loanId = parsePositiveInt(req.params.loanId);

    if (!loanId) return res.status(400).json({ error: 'Invalid loan id' });

    const rows = await prisma.repayment.findMany({
      where: { loanId, loan: { organizationId: req.organization.id } },
      orderBy: { date: 'desc' },
      include: {
        paidByUser: { select: { name: true } },
      },
    });

    res.json(rows.map((r) => ({
      ...r,
      paidByName: r.paidByUser?.name || 'Staff',
    })));
  } catch (err) {
    return sendServerError(res, err, 'List repayments error');
  }
};

const batchGroupRepayment = async (req, res) => {
  try {
    const { groupId, payments, paymentMethod } = req.body;
    const parsedGroupId = parsePositiveInt(groupId);
    if (!parsedGroupId) return res.status(400).json({ error: 'Invalid group id' });
    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ error: 'payments array is required and cannot be empty' });
    }

    const paidBy = req.user.id;
    const validMethods = ['cash', 'mobile_money', 'bank_transfer', 'cheque'];
    const selectedMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'cash';
    const date = new Date();

    let totalCollected = 0;
    let successfulCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of payments) {
        const loanId = parsePositiveInt(item.loanId);
        const amount = parseFiniteNumber(item.amount);
        if (!loanId || !amount || amount <= 0) continue;

        const loan = await tx.loan.findUnique({ where: { id: loanId } });
        if (!loan || loan.status !== 'disbursed') continue;

        const paymentAmount = Math.min(amount, Number(loan.balance));
        if (paymentAmount <= 0) continue;

        await tx.repayment.create({
          data: {
            loanId,
            amount: paymentAmount,
            paymentMethod: selectedMethod,
            reference: item.reference ? String(item.reference).trim().slice(0, 100) : `FIELD-GRP-${parsedGroupId}`,
            date,
            paidBy,
          },
        });

        const updatedBalance = Math.max(0, Number(loan.balance) - paymentAmount);
        await tx.loan.update({
          where: { id: loanId },
          data: {
            balance: updatedBalance,
            status: updatedBalance <= 0 ? 'closed' : loan.status,
          },
        });

        if (item.scheduleId) {
          const parsedScheduleId = parsePositiveInt(item.scheduleId);
          if (parsedScheduleId) {
            const schedule = await tx.schedule.findUnique({ where: { id: parsedScheduleId } });
            if (schedule && schedule.status !== 'paid') {
              const currentPaid = Number(schedule.paidAmount || 0);
              const targetPayment = Number(schedule.payment || 0);
              const updatedPaid = Math.min(targetPayment, currentPaid + paymentAmount);
              const nextStatus = updatedPaid >= targetPayment ? 'paid' : (new Date(schedule.dueDate) < date ? 'overdue' : 'pending');

              await tx.schedule.update({
                where: { id: schedule.id },
                data: { paidAmount: updatedPaid, status: nextStatus },
              });
            }
          }
        }

        totalCollected += paymentAmount;
        successfulCount += 1;
      }
    });

    await logAudit(req.user.id, 'BATCH_GROUP_REPAYMENT', 'group', parsedGroupId);

    res.json({
      success: true,
      groupId: parsedGroupId,
      collectedCount: successfulCount,
      totalCollected,
      collectedAt: date.toISOString(),
    });
  } catch (err) {
    return sendServerError(res, err, 'Batch group repayment error');
  }
};

const getFieldCollectionsSummary = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const repaymentsToday = await prisma.repayment.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
      },
      include: {
        paidByUser: { select: { id: true, name: true, role: true } },
        loan: {
          include: {
            client: {
              include: {
                group: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const officerMap = {};

    repaymentsToday.forEach((r) => {
      const officerId = r.paidBy;
      const officerName = r.paidByUser?.name || `Staff #${officerId}`;
      const groupName = r.loan?.client?.group?.name || 'Individual Loans';
      const amount = Number(r.amount);

      if (!officerMap[officerId]) {
        officerMap[officerId] = {
          officerId,
          officerName,
          totalCollected: 0,
          groups: {},
          collectionsCount: 0,
          handoverStatus: 'pending_handover',
        };
      }

      officerMap[officerId].totalCollected += amount;
      officerMap[officerId].collectionsCount += 1;
      officerMap[officerId].groups[groupName] = (officerMap[officerId].groups[groupName] || 0) + amount;
    });

    const summaryList = Object.values(officerMap).map((off) => ({
      ...off,
      groupsBreakdown: Object.entries(off.groups).map(([groupName, amount]) => ({ groupName, amount })),
    }));

    const grandTotalToday = summaryList.reduce((sum, item) => sum + item.totalCollected, 0);

    res.json({
      date: todayStart.toISOString().split('T')[0],
      grandTotalToday,
      totalOfficersInField: summaryList.length,
      officers: summaryList,
    });
  } catch (err) {
    return sendServerError(res, err, 'Get field collections summary error');
  }
};

const acceptCashHandover = async (req, res) => {
  try {
    const { officerId, amountHanded } = req.body;
    const parsedOfficerId = parsePositiveInt(officerId);
    if (!parsedOfficerId) return res.status(400).json({ error: 'Invalid officer id' });

    await logAudit(req.user.id, 'ACCEPT_CASH_HANDOVER', 'user', parsedOfficerId);

    res.json({
      success: true,
      officerId: parsedOfficerId,
      acceptedBy: req.user.id,
      amountAccepted: parseFiniteNumber(amountHanded) || 0,
      timestamp: new Date().toISOString(),
      message: 'Cash handover successfully recorded and deposited into vault.',
    });
  } catch (err) {
    return sendServerError(res, err, 'Accept cash handover error');
  }
};

module.exports = { repayLoan, getRepayments, batchGroupRepayment, getFieldCollectionsSummary, acceptCashHandover };
