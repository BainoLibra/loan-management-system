const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');
const { parseFiniteNumber, parsePositiveInt, sendServerError } = require('../utils/http');

const getLoanById = async (id) => {
  return prisma.loan.findUnique({
    where: { id },
  });
};

const repayLoan = async (req, res) => {
  try {
    const loanId = parsePositiveInt(req.params.loanId);
    const { amount, scheduleId } = req.body;

    const paidBy = req.user.id;
    const repaymentAmount = parseFiniteNumber(amount);

    if (!loanId) return res.status(400).json({ error: 'Invalid loan id' });
    if (repaymentAmount == null || repaymentAmount <= 0) {
      return res.status(400).json({ error: 'Repayment amount must be greater than zero' });
    }

    const loan = await getLoanById(loanId);

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'disbursed') return res.status(400).json({ error: 'Loan must be disbursed before repayment' });

    if (repaymentAmount > Number(loan.balance)) return res.status(400).json({ error: 'Repayment exceeds remaining balance' });

    const date = new Date();

    let schedule = null;
    if (scheduleId) {
      const parsedScheduleId = parsePositiveInt(scheduleId);
      if (!parsedScheduleId) return res.status(400).json({ error: 'Invalid schedule id' });

      schedule = await prisma.schedule.findUnique({
        where: { id: parsedScheduleId },
      });
      if (!schedule || schedule.loanId !== loanId) return res.status(404).json({ error: 'Schedule not found' });
      if (schedule.status === 'paid') return res.status(400).json({ error: 'Installment already paid' });
    }

    const repayment = await prisma.$transaction(async (tx) => {
      const createdRepayment = await tx.repayment.create({
        data: {
          loanId,
          amount: repaymentAmount,
          date,
          paidBy,
        },
      });

      const updatedBalance = Math.max(0, Number(loan.balance) - repaymentAmount);

      await tx.loan.update({
        where: { id: loanId },
        data: {
          balance: updatedBalance,
          status: updatedBalance <= 0 ? 'closed' : loan.status,
        },
      });

      if (schedule) {
        await tx.schedule.update({
          where: { id: schedule.id },
          data: { status: 'paid' },
        });
      }

      return createdRepayment;
    });

    await logAudit(req.user.id, 'REPAY_LOAN', 'loan', loanId);

    res.json({ repaymentId: repayment.id });
  } catch (err) {
    return sendServerError(res, err, 'Record repayment error');
  }
};

const getRepayments = async (req, res) => {
  try {
    const loanId = parsePositiveInt(req.params.loanId);

    if (!loanId) return res.status(400).json({ error: 'Invalid loan id' });

    const rows = await prisma.repayment.findMany({
      where: { loanId },
      orderBy: { date: 'desc' },
    });

    res.json(rows);
  } catch (err) {
    return sendServerError(res, err, 'List repayments error');
  }
};

module.exports = { repayLoan, getRepayments };
