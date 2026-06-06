const { prisma } = require('../db');
const { sendServerError } = require('../utils/http');

const formatClientName = (client) => {
  if (!client) return null;
  return [client.firstName, client.lastName].filter(Boolean).join(' ') || null;
};

const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeLoanCount, portfolioResult, dueTodaySchedules, overdueSchedules, overdue30Schedules, collectionsResult] = await Promise.all([
      prisma.loan.count({ where: { status: 'disbursed' } }),
      prisma.loan.aggregate({ where: { status: 'disbursed' }, _sum: { balance: true } }),
      prisma.schedule.findMany({
        where: {
          dueDate: { gte: today, lt: tomorrow },
          status: { in: ['pending', 'overdue'] },
        },
      }),
      prisma.schedule.findMany({
        where: {
          dueDate: { lt: today },
          status: { in: ['pending', 'overdue'] },
        },
      }),
      prisma.schedule.findMany({
        where: {
          dueDate: { lt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) },
          status: { in: ['pending', 'overdue'] },
        },
      }),
      prisma.repayment.aggregate({
        where: { date: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
      }),
    ]);

    const portfolioOutstanding = Number(portfolioResult._sum.balance || 0);

    const sumDue = (items) => items.reduce((total, item) => {
      const payment = Number(item.payment || 0);
      const paidAmount = Number(item.paidAmount || 0);
      return total + Math.max(0, payment - paidAmount);
    }, 0);

    const loansInArrears = sumDue(overdueSchedules);
    const overdue30Amount = sumDue(overdue30Schedules);
    const dueToday = sumDue(dueTodaySchedules);
    const collectionsToday = Number(collectionsResult._sum.amount || 0);
    const parAbove30Days = portfolioOutstanding > 0
      ? (overdue30Amount / portfolioOutstanding) * 100
      : 0;

    res.json({
      totalActiveLoans: activeLoanCount,
      portfolioOutstanding,
      loansInArrears,
      parAbove30Days,
      dueToday,
      collectionsToday,
    });
  } catch (err) {
    return sendServerError(res, err, 'Dashboard summary error');
  }
};

const getAgingReport = async (req, res) => {
  try {
    const rows = await prisma.loan.findMany({
      where: { status: 'disbursed' },
      include: { client: { select: { firstName: true, lastName: true } } },
      orderBy: { disbursedAt: 'desc' },
    });

    const now = new Date();

    const result = rows.map(loan => {
      if (!loan.disbursedAt) return null;

      const disbursedDate = new Date(loan.disbursedAt);

      // Expected end date
      const dueDate = new Date(disbursedDate);
      dueDate.setMonth(dueDate.getMonth() + loan.termMonths);

      // Days overdue
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

      let bucket = 'CURRENT';

      if (daysOverdue > 30 && daysOverdue <= 60) bucket = 'PAR 30';
      else if (daysOverdue > 60 && daysOverdue <= 90) bucket = 'PAR 60';
      else if (daysOverdue > 90) bucket = 'PAR 90';

      return {
        id: loan.id,
        clientName: formatClientName(loan.client),
        amount: loan.amount,
        balance: loan.balance,
        termMonths: loan.termMonths,
        disbursedAt: loan.disbursedAt,
        status: loan.status,
        dueDate,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        bucket,
        inArrears: daysOverdue > 0 && Number(loan.balance) > 0
      };
    });

    res.json(result);
  } catch (err) {
    return sendServerError(res, err, 'Aging report error');
  }
};

module.exports = { getAgingReport, getDashboardSummary };
