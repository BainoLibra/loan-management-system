const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');
const { optionalTrimmedString, parseFiniteNumber, parsePositiveInt, sendServerError } = require('../utils/http');

const getLoanById = async (id) => {
  return prisma.loan.findUnique({
    where: { id },
  });
};

const formatClientName = (client) => {
  if (!client) return null;
  return [client.firstName, client.lastName].filter(Boolean).join(' ') || null;
};

const createLoan = async (req, res) => {
  try {
    const { clientId, amount, interestRate, termMonths, guarantorName, notes, documents } = req.body;
    const parsedClientId = parsePositiveInt(clientId);

    // Validate required fields
    if (!parsedClientId || amount === undefined || interestRate === undefined || termMonths === undefined) {
      return res.status(400).json({ error: 'clientId, amount, interestRate, and termMonths are required' });
    }

    // Validate amount
    const numAmount = parseFiniteNumber(amount);
    if (numAmount == null || numAmount < 300000 || numAmount > 2000000) {
      return res.status(400).json({ error: 'Loan amount must be a number between 300,000 and 2,000,000' });
    }

    // Validate interestRate
    const numInterestRate = parseFiniteNumber(interestRate);
    if (numInterestRate == null || numInterestRate < 0 || numInterestRate > 50) {
      return res.status(400).json({ error: 'Interest rate must be a number between 0 and 50' });
    }

    // Validate termMonths
    const numTermMonths = parsePositiveInt(termMonths);
    if (!numTermMonths || numTermMonths > 120) {
      return res.status(400).json({ error: 'Term months must be a number between 1 and 120' });
    }

    const sanitizedGuarantorName = optionalTrimmedString(guarantorName, 100);
    const sanitizedNotes = optionalTrimmedString(notes, 1000);
    const sanitizedDocuments = optionalTrimmedString(documents, 255);
    if ((guarantorName && !sanitizedGuarantorName) || (notes && !sanitizedNotes) || (documents && !sanitizedDocuments)) {
      return res.status(400).json({ error: 'One or more text fields are too long or invalid' });
    }

    // Validate client exists
    const client = await prisma.client.findUnique({
      where: { id: parsedClientId },
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
        clientId: parsedClientId,
        amount: numAmount,
        interestRate: numInterestRate,
        termMonths: numTermMonths,
        guarantorName: sanitizedGuarantorName,
        notes: sanitizedNotes,
        documents: sanitizedDocuments,
        status,
        appliedAt,
        balance,
        createdBy,
      },
    });

    await logAudit(req.user.id, 'CREATE_LOAN', 'loan', loan.id);

    res.json({ id: loan.id });
  } catch (err) {
    return sendServerError(res, err, 'Create loan error');
  }
};

const getLoans = async (req, res) => {
  try {
    const where = req.user.role === 'client'
      ? { client: { email: req.user.email || '__no_client_email__' } }
      : {};

    const rows = await prisma.loan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { firstName: true, lastName: true } },
      },
    });

    res.json(rows.map((loan) => ({
      ...loan,
      clientName: formatClientName(loan.client),
    })));
  } catch (err) {
    return sendServerError(res, err, 'List loans error');
  }
};

const approveLoan = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const approvedBy = req.user.id;

    if (!id) return res.status(400).json({ error: 'Invalid loan id' });

    const loan = await getLoanById(id);

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'applied') return res.status(400).json({ error: 'Only applied loans can be approved' });

    const approvedAt = new Date();

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
        loanId: id,
        month: i,
        dueDate,
        payment: Math.round(monthlyPayment * 100) / 100,
        principal: Math.round(principalPortion * 100) / 100,
        interest: Math.round(interestPortion * 100) / 100,
        balance: Math.round(remaining * 100) / 100,
        status: 'pending',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.loan.update({
        where: { id },
        data: {
          status: 'approved',
          approvedBy,
          approvedAt,
        },
      });

      await tx.schedule.createMany({
        data: schedules,
      });
    });

    await logAudit(req.user.id, 'APPROVE_LOAN', 'loan', id);

    res.json({ updated: 1 });
  } catch (err) {
    return sendServerError(res, err, 'Approve loan error');
  }
};

const rejectLoan = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) return res.status(400).json({ error: 'Invalid loan id' });

    const loan = await getLoanById(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status !== 'applied') return res.status(400).json({ error: 'Only applied loans can be rejected' });

    await prisma.loan.update({
      where: { id },
      data: { status: 'rejected' },
    });

    await logAudit(req.user.id, 'REJECT_LOAN', 'loan', id);

    res.json({ updated: 1 });
  } catch (err) {
    return sendServerError(res, err, 'Reject loan error');
  }
};

const disburseLoan = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) return res.status(400).json({ error: 'Invalid loan id' });

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
      where: { id },
      data: {
        status: 'disbursed',
        disbursedAt,
        balance,
      },
    });

    await logAudit(req.user.id, 'DISBURSE_LOAN', 'loan', id);

    res.json({ updated: 1 });
  } catch (err) {
    return sendServerError(res, err, 'Disburse loan error');
  }
};

const getLoanSchedule = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid loan id' });

    const loan = await getLoanById(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    // Update overdue
    const today = new Date();
    await prisma.schedule.updateMany({
      where: {
        loanId: id,
        dueDate: { lt: today },
        status: 'pending',
      },
      data: { status: 'overdue' },
    });

    const schedules = await prisma.schedule.findMany({
      where: { loanId: id },
      orderBy: { month: 'asc' },
    });

    res.json(schedules);
  } catch (err) {
    return sendServerError(res, err, 'Get loan schedule error');
  }
};

module.exports = { createLoan, getLoans, approveLoan, rejectLoan, disburseLoan, getLoanSchedule };
