const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');

const getLoanById = async (id) => {
  return prisma.loan.findUnique({
    where: { id: Number(id) },
  });
};

const repayLoan = async (req, res) => {
  try {
    const loanId = req.params.loanId;
    const { amount, scheduleId } = req.body;

    const paidBy = req.user.id;
    const repaymentAmount = Number(amount);

    const loan = await getLoanById(loanId);

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'disbursed') return res.status(400).json({ error: 'Loan must be disbursed before repayment' });

    if (repaymentAmount <= 0) return res.status(400).json({ error: 'Invalid repayment amount' });

    if (repaymentAmount > Number(loan.balance)) return res.status(400).json({ error: 'Repayment exceeds remaining balance' });

    const date = new Date();

    let schedule = null;
    if (scheduleId) {
      schedule = await prisma.schedule.findUnique({
        where: { id: Number(scheduleId) },
      });
      if (!schedule || schedule.loanId !== Number(loanId)) return res.status(404).json({ error: 'Schedule not found' });
      if (schedule.status === 'paid') return res.status(400).json({ error: 'Installment already paid' });
    }

    const repayment = await prisma.$transaction(async (tx) => {
      const createdRepayment = await tx.repayment.create({
        data: {
          loanId: Number(loanId),
          amount: repaymentAmount,
          date,
          paidBy,
        },
      });

      const updatedBalance = Math.max(0, Number(loan.balance) - repaymentAmount);

      await tx.loan.update({
        where: { id: Number(loanId) },
        data: {
          balance: updatedBalance,
          status: updatedBalance <= 0 ? 'closed' : loan.status,
        },
      });

      if (schedule) {
        await tx.schedule.update({
          where: { id: Number(scheduleId) },
          data: { status: 'paid' },
        });
      }

      return createdRepayment;
    });

    await logAudit(req.user.id, 'REPAY_LOAN', 'loan', loanId);

    res.json({ repaymentId: repayment.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRepayments = async (req, res) => {
  try {
    const loanId = req.params.loanId;

    const rows = await prisma.repayment.findMany({
      where: { loanId: Number(loanId) },
      orderBy: { date: 'desc' },
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { repayLoan, getRepayments };
