const { prisma } = require('../db');
const { sendServerError } = require('../utils/http');

const formatClientName = (client) => {
  if (!client) return null;
  return [client.firstName, client.lastName].filter(Boolean).join(' ') || null;
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

module.exports = { getAgingReport };
