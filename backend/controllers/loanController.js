const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');

const getLoanById = async (id) => {
  return prisma.loan.findUnique({
    where: { id: Number(id) },
  });
};

const createLoan = async (req, res) => {
  try {
    const { clientId, amount, interestRate, termMonths, guarantorName, notes, documents } = req.body;

    // Validate required fields
    if (!clientId || !amount || interestRate === undefined || !termMonths) {
      return res.status(400).json({ error: 'clientId, amount, interestRate, and termMonths are required' });
    }

    // Validate amount
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 300000 || numAmount > 2000000) {
      return res.status(400).json({ error: 'Loan amount must be a number between 300,000 and 2,000,000' });
    }

    // Validate interestRate
    const numInterestRate = Number(interestRate);
    if (isNaN(numInterestRate) || numInterestRate < 0 || numInterestRate > 50) {
      return res.status(400).json({ error: 'Interest rate must be a number between 0 and 50' });
    }

    // Validate termMonths
    const numTermMonths = Number(termMonths);
    if (isNaN(numTermMonths) || numTermMonths < 1 || numTermMonths > 120) {
      return res.status(400).json({ error: 'Term months must be a number between 1 and 120' });
    }

    // Validate client exists
    const client = await prisma.client.findUnique({
      where: { id: Number(clientId) },
    });
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const createdBy = req.user.id;
    const appliedAt = new Date();
    const status = 'applied';
    const balance = numAmount;

    const loan = await prisma.loan.create({
      data: {
        clientId: Number(clientId),
        amount: numAmount,
        interestRate: numInterestRate,
        termMonths: numTermMonths,
        guarantorName,
        notes,
        documents,
        status,
        appliedAt,
        balance,
        createdBy,
      },
    });

    await logAudit(req.user.id, 'CREATE_LOAN', 'loan', loan.id);

    res.json({ id: loan.id });
  } catch (err) {
    console.error('Error creating loan:', err);
    res.status(500).json({ error: 'Failed to create loan. Please check your input and try again.' });
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

    // Generate schedule
    const principal = Number(loan.amount);
    const rate = Number(loan.interestRate) / 100 / 12; // monthly rate
    const n = loan.termMonths;

    let monthlyPayment;
    if (rate === 0) {
      monthlyPayment = principal / n;
    } else {
      monthlyPayment = principal * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
    }

    const schedules = [];
    let remaining = principal;
    const startDate = approvedAt;

    for (let i = 1; i <= n; i++) {
      const interestPortion = remaining * rate;
      const principalPortion = monthlyPayment - interestPortion;
      remaining = Math.max(0, remaining - principalPortion);

      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedules.push({
        loanId: Number(id),
        month: i,
        dueDate,
        payment: Math.round(monthlyPayment * 100) / 100,
        principal: Math.round(principalPortion * 100) / 100,
        interest: Math.round(interestPortion * 100) / 100,
        balance: Math.round(remaining * 100) / 100,
        status: 'pending',
      });
    }

    await prisma.schedule.createMany({
      data: schedules,
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

    // Update overdue
    const today = new Date();
    await prisma.schedule.updateMany({
      where: {
        loanId: Number(id),
        dueDate: { lt: today },
        status: 'pending',
      },
      data: { status: 'overdue' },
    });

    const schedules = await prisma.schedule.findMany({
      where: { loanId: Number(id) },
      orderBy: { month: 'asc' },
    });

    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createLoan, getLoans, approveLoan, rejectLoan, disburseLoan, getLoanSchedule };
