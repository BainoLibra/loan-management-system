const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');

const getLoanById = async (id) => {
  return prisma.loan.findUnique({
    where: { id: Number(id) },
  });
};

const createLoan = async (req, res) => {
  try {
    const { clientId, amount, interestRate, termMonths } = req.body;

    const numAmount = Number(amount);
    if (numAmount < 300000 || numAmount > 2000000) {
      return res.status(400).json({ error: 'Loan amount must be between 300,000 and 2,000,000' });
    }

    const createdBy = req.user.id;

    const appliedAt = new Date();
    const status = 'applied';
    const balance = amount;

    const loan = await prisma.loan.create({
      data: {
        clientId: Number(clientId),
        amount,
        interestRate: 1.5, // Monthly interest rate
        termMonths: 6,
        status,
        appliedAt,
        balance,
        createdBy,
      },
    });

    await logAudit(req.user.id, 'CREATE_LOAN', 'loan', loan.id);

    res.json({ id: loan.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLoans = async (req, res) => {
  try {
    const where = req.user.role === 'client' ? { clientId: req.user.id } : {};

    const rows = await prisma.loan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { name: true } },
      },
    });

    res.json(rows.map((loan) => ({
      ...loan,
      clientName: loan.client?.name || null,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const approveLoan = async (req, res) => {
  try {
    const id = req.params.id;
    const approvedBy = req.user.id;

    const loan = await getLoanById(id);

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'applied') return res.status(400).json({ error: 'Only applied loans can be approved' });

    const approvedAt = new Date();

    await prisma.loan.update({
      where: { id: Number(id) },
      data: {
        status: 'approved',
        approvedBy,
        approvedAt,
      },
    });

    await logAudit(req.user.id, 'APPROVE_LOAN', 'loan', id);

    res.json({ updated: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const rejectLoan = async (req, res) => {
  try {
    const id = req.params.id;

    const loan = await getLoanById(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status !== 'applied') return res.status(400).json({ error: 'Only applied loans can be rejected' });

    await prisma.loan.update({
      where: { id: Number(id) },
      data: { status: 'rejected' },
    });

    await logAudit(req.user.id, 'REJECT_LOAN', 'loan', id);

    res.json({ updated: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const disburseLoan = async (req, res) => {
  try {
    const id = req.params.id;

    const loan = await getLoanById(id);

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'approved') return res.status(400).json({ error: 'Loan must be approved before disbursement' });

    const disbursedAt = new Date();

    // Apply interest to balance on disbursement
    const principal = Number(loan.amount);
    const rate = Number(loan.interestRate) / 100; // monthly rate
    const totalWithInterest = principal + (principal * rate * loan.termMonths);
    const balance = Math.round(totalWithInterest * 100) / 100;

    await prisma.loan.update({
      where: { id: Number(id) },
      data: {
        status: 'disbursed',
        disbursedAt,
        balance,
      },
    });

    await logAudit(req.user.id, 'DISBURSE_LOAN', 'loan', id);

    res.json({ updated: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLoanSchedule = async (req, res) => {
  try {
    const id = req.params.id;
    const loan = await getLoanById(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const principal = Number(loan.amount);
    const monthlyRate = Number(loan.interestRate) / 100; // monthly rate
    const n = loan.termMonths;

    // Flat rate calculation
    const monthlyPrincipal = principal / n;
    const monthlyInterest = principal * monthlyRate;
    const monthlyPayment = monthlyPrincipal + monthlyInterest;

    const schedule = [];
    let remaining = principal;
    const startDate = loan.disbursedAt ? new Date(loan.disbursedAt) : new Date(loan.appliedAt);

    for (let i = 1; i <= n; i++) {
      const interestPortion = monthlyInterest;
      const principalPortion = monthlyPrincipal;
      remaining = Math.max(0, remaining - principalPortion);

      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        month: i,
        dueDate,
        payment: Math.round(monthlyPayment * 100) / 100,
        principal: Math.round(principalPortion * 100) / 100,
        interest: Math.round(interestPortion * 100) / 100,
        balance: Math.round(remaining * 100) / 100,
      });
    }

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createLoan, getLoans, approveLoan, rejectLoan, disburseLoan, getLoanSchedule };
