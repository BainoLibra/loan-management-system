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

const getArrearsCategory = (daysOverdue) => {
  if (daysOverdue > 90) return 'Loss';
  if (daysOverdue > 60) return 'Doubtful';
  if (daysOverdue > 30) return 'Substandard';
  if (daysOverdue > 0) return 'Watch';
  return 'Current';
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
    const { approvedAmount, approvalReason } = req.body;

    if (!id) return res.status(400).json({ error: 'Invalid loan id' });

    const loan = await getLoanById(id);

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (!['applied', 'revision_requested'].includes(loan.status)) {
      return res.status(400).json({ error: 'Only applied or revision requested loans can be approved' });
    }

    const numApprovedAmount = approvedAmount === undefined || approvedAmount === null
      ? Number(loan.amount)
      : parseFiniteNumber(approvedAmount);

    if (numApprovedAmount == null || numApprovedAmount <= 0 || numApprovedAmount > Number(loan.amount)) {
      return res.status(400).json({ error: 'Approved amount must be a positive number and no greater than requested amount' });
    }

    const sanitizedApprovalReason = optionalTrimmedString(approvalReason, 1000);
    if (approvalReason && !sanitizedApprovalReason) {
      return res.status(400).json({ error: 'Approval reason is too long or invalid' });
    }

    const approvedAt = new Date();
    const principal = numApprovedAmount;
    const monthlyRate = Number(loan.interestRate) / 100; // flat monthly rate
    const n = loan.termMonths;

    const totalInterest = principal * monthlyRate * n;
    const totalRepayment = principal + totalInterest;
    const roundedTotalInterest = Math.round(totalInterest * 100) / 100;
    const roundedTotalRepayment = Math.round(totalRepayment * 100) / 100;
    const monthlyPayment = Math.round((roundedTotalRepayment / n) * 100) / 100;
    const monthlyInterest = Math.round((principal * monthlyRate) * 100) / 100;

    const schedules = [];
    let remainingBalance = principal;
    let accumulatedPayment = 0;
    let accumulatedInterest = 0;
    const startDate = approvedAt;

    for (let i = 1; i <= n; i++) {
      let interestPortion = monthlyInterest;
      let payment = monthlyPayment;
      if (i === n) {
        interestPortion = Math.round((roundedTotalInterest - accumulatedInterest) * 100) / 100;
        payment = Math.round((roundedTotalRepayment - accumulatedPayment) * 100) / 100;
      }
      const principalPortion = Math.round((payment - interestPortion) * 100) / 100;
      remainingBalance = Math.max(0, Math.round((remainingBalance - principalPortion) * 100) / 100);
      accumulatedPayment = Math.round((accumulatedPayment + payment) * 100) / 100;
      accumulatedInterest = Math.round((accumulatedInterest + interestPortion) * 100) / 100;

      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedules.push({
        loanId: id,
        month: i,
        dueDate,
        payment,
        principal: principalPortion,
        interest: interestPortion,
        balance: remainingBalance,
        paidAmount: 0,
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
          approvedAmount: numApprovedAmount,
          approvalReason: sanitizedApprovalReason,
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
    if (!['applied', 'revision_requested'].includes(loan.status)) {
      return res.status(400).json({ error: 'Only applied or revision requested loans can be rejected' });
    }

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
    const principal = Number(loan.approvedAmount ?? loan.amount);
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

const requestRevisionLoan = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const { revisionReason } = req.body;

    if (!id) return res.status(400).json({ error: 'Invalid loan id' });

    const loan = await getLoanById(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status !== 'applied') return res.status(400).json({ error: 'Only applied loans can be marked for revision' });

    const sanitizedRevisionReason = optionalTrimmedString(revisionReason, 1000);
    if (!sanitizedRevisionReason) {
      return res.status(400).json({ error: 'Revision reason is required and must be valid' });
    }

    await prisma.loan.update({
      where: { id },
      data: {
        status: 'revision_requested',
        revisionReason: sanitizedRevisionReason,
      },
    });

    await logAudit(req.user.id, 'REQUEST_REVISION', 'loan', id);

    res.json({ updated: 1 });
  } catch (err) {
    return sendServerError(res, err, 'Request loan revision error');
  }
};

const getLoanSchedule = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid loan id' });

    const loan = await getLoanById(id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

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

    const enrichedSchedules = schedules.map((schedule) => {
      const paidAmount = Number(schedule.paidAmount || 0);
      const paymentAmount = Number(schedule.payment || 0);
      const amountDue = Math.max(0, paymentAmount - paidAmount);
      const dueDate = new Date(schedule.dueDate);
      const daysOverdue = schedule.status !== 'paid' && dueDate < today
        ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
        : 0;
      return {
        ...schedule,
        amountDue,
        paidAmount,
        daysOverdue,
        arrearsCategory: getArrearsCategory(daysOverdue),
      };
    });

    res.json(enrichedSchedules);
  } catch (err) {
    return sendServerError(res, err, 'Get loan schedule error');
  }
};

module.exports = { createLoan, getLoans, approveLoan, rejectLoan, requestRevisionLoan, disburseLoan, getLoanSchedule };
