const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');
const { canAccessClient } = require('../utils/accessControl');
const { postJournalEntry } = require('../utils/accounting');
const { queueNotification } = require('../utils/notifications');
const { optionalTrimmedString, parseFiniteNumber, parsePositiveInt, sendServerError } = require('../utils/http');

const getLoanById = async (id) => {
  return prisma.loan.findUnique({
    where: { id },
  });
};

const getOrganizationLoanById = async (id, organizationId) => prisma.loan.findFirst({
  where: { id, organizationId },
});

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
    const { clientId, productId, amount, interestRate, termMonths, guarantorName, notes, documents } = req.body;
    const parsedClientId = parsePositiveInt(clientId);
    const parsedProductId = productId ? parsePositiveInt(productId) : null;

    // Validate required fields
    if (!parsedClientId || amount === undefined || interestRate === undefined || termMonths === undefined) {
      return res.status(400).json({ error: 'clientId, amount, interestRate, and termMonths are required' });
    }
    if (productId && !parsedProductId) return res.status(400).json({ error: 'Invalid loan product id' });

    const product = parsedProductId
      ? await prisma.loanProduct.findFirst({ where: { id: parsedProductId, organizationId: req.organization.id, active: true } })
      : null;
    if (parsedProductId && !product) return res.status(404).json({ error: 'Active loan product not found' });

    // Validate amount
    const numAmount = parseFiniteNumber(amount);
    if (numAmount == null || numAmount < 200000 || numAmount > 10000000) {
      return res.status(400).json({ error: 'Loan amount must be a number between 200,000 UGX and 10,000,000 UGX' });
    }
    if (product && (numAmount < Number(product.minAmount) || numAmount > Number(product.maxAmount))) {
      return res.status(400).json({ error: 'Loan amount is outside the selected product limits' });
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
    if (product && (numTermMonths < product.minTermMonths || numTermMonths > product.maxTermMonths)) {
      return res.status(400).json({ error: 'Loan term is outside the selected product limits' });
    }
    if (product && numInterestRate !== Number(product.interestRate)) {
      return res.status(400).json({ error: 'Interest rate must match the selected loan product' });
    }

    const sanitizedGuarantorName = optionalTrimmedString(guarantorName, 100);
    const sanitizedNotes = optionalTrimmedString(notes, 1000);
    const sanitizedDocuments = optionalTrimmedString(documents, 255);
    if ((guarantorName && !sanitizedGuarantorName) || (notes && !sanitizedNotes) || (documents && !sanitizedDocuments)) {
      return res.status(400).json({ error: 'One or more text fields are too long or invalid' });
    }

    // Validate client exists
    const client = await prisma.client.findFirst({
      where: { id: parsedClientId, organizationId: req.organization.id },
    });
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    if (!await canAccessClient(req.user, parsedClientId)) {
      return res.status(403).json({ error: 'You do not have access to create loans for this client' });
    }

    const createdBy = req.user.id;
    const appliedAt = new Date();
    const status = 'applied';
    const balance = numAmount;

    const loan = await prisma.loan.create({
      data: {
        organizationId: req.organization.id,
        productId: parsedProductId,
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
      ? { organizationId: req.organization.id, client: { email: req.user.email || '__no_client_email__' } }
      : { organizationId: req.organization.id };

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

    const loan = await getOrganizationLoanById(id, req.organization.id);

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    // Dual Control: Block creator from self-approving (unless Admin)
    if (loan.createdBy === req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Dual control policy: You cannot approve a loan that you created. Another manager must review it.' });
    }

    // Branch Manager Limit: Maximum 5,000,000 UGX
    if (req.user.role === 'branch_manager' && Number(loan.amount) > 5000000) {
      return res.status(403).json({ error: 'Branch Managers can only approve loans up to 5,000,000 UGX. Loans above 5,000,000 UGX require Administrator approval.' });
    }

    if (req.user.role === 'branch_manager' && loan.productId) {
      const product = await prisma.loanProduct.findFirst({
        where: { id: loan.productId, organizationId: req.organization.id, active: true },
      });
      if (!product) return res.status(400).json({ error: 'Loan product is no longer active' });
      if (Number(loan.amount) > Number(product.approvalLimit)) {
        return res.status(403).json({ error: 'This loan exceeds the configured approval limit for the selected product.' });
      }
    }

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
    const startDate = approvedAt;
    const schedules = [];

    if (loan.termMonths === 6) {
      const weeklyPayment = Math.round((principal * 0.05) * 100) / 100;
      const totalWeeks = 23;
      let remainingBalance = principal;

      for (let i = 1; i <= totalWeeks; i++) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (i * 7));
        remainingBalance = Math.max(0, Math.round((remainingBalance - weeklyPayment) * 100) / 100);

        schedules.push({
          loanId: id,
          month: i,
          dueDate,
          payment: weeklyPayment,
          principal: weeklyPayment,
          interest: 0,
          balance: remainingBalance,
          paidAmount: 0,
          status: 'pending',
        });
      }
    } else {
      const monthlyRate = Number(loan.interestRate) / 100; // flat monthly rate
      const n = loan.termMonths;

      const totalInterest = principal * monthlyRate * n;
      const totalRepayment = principal + totalInterest;
      const roundedTotalInterest = Math.round(totalInterest * 100) / 100;
      const roundedTotalRepayment = Math.round(totalRepayment * 100) / 100;
      const monthlyPayment = Math.round((roundedTotalRepayment / n) * 100) / 100;
      const monthlyInterest = Math.round((principal * monthlyRate) * 100) / 100;

      let remainingBalance = principal;
      let accumulatedPayment = 0;
      let accumulatedInterest = 0;

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
    }

    await prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.updateMany({
        where: { id, status: { in: ['applied', 'revision_requested'] } },
        data: {
          status: 'approved',
          approvedBy,
          approvedAt,
          approvedAmount: numApprovedAmount,
          approvalReason: sanitizedApprovalReason,
        },
      });

      if (updatedLoan.count !== 1) {
        const error = new Error('Loan has already been reviewed. Refresh and try again.');
        error.status = 409;
        error.expose = true;
        throw error;
      }

      await tx.schedule.deleteMany({ where: { loanId: id } });
      await tx.schedule.createMany({
        data: schedules,
      });
      await tx.loanApproval.create({
        data: {
          loanId: id,
          approverId: approvedBy,
          decision: 'APPROVED',
          approvedAmount: numApprovedAmount,
          comments: sanitizedApprovalReason,
        },
      });
    });

    await logAudit(req.user.id, 'APPROVE_LOAN', 'loan', id);
    const approvedClient = await prisma.client.findFirst({ where: { id: loan.clientId, organizationId: req.organization.id }, select: { id: true, email: true } });
    if (approvedClient?.email) await queueNotification({
      prisma,
      organizationId: req.organization.id,
      clientId: approvedClient.id,
      recipientEmail: approvedClient.email,
      eventType: 'LOAN_APPROVED',
      subject: `Loan ${id} approved`,
      body: `Your loan application ${id} has been approved.`,
    });

    res.json({ updated: 1 });
  } catch (err) {
    return sendServerError(res, err, 'Approve loan error');
  }
};

const rejectLoan = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) return res.status(400).json({ error: 'Invalid loan id' });

    const loan = await getOrganizationLoanById(id, req.organization.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.createdBy === req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Dual control policy: You cannot reject a loan that you created.' });
    }

    if (!['applied', 'revision_requested'].includes(loan.status)) {
      return res.status(400).json({ error: 'Only applied or revision requested loans can be rejected' });
    }

    await prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.updateMany({
        where: { id, organizationId: req.organization.id, status: { in: ['applied', 'revision_requested'] } },
        data: { status: 'rejected' },
      });
      if (updatedLoan.count !== 1) {
        const error = new Error('Loan has already been reviewed. Refresh and try again.');
        error.status = 409;
        error.expose = true;
        throw error;
      }
      await tx.loanApproval.create({
        data: { loanId: id, approverId: req.user.id, decision: 'REJECTED' },
      });
    });

    await logAudit(req.user.id, 'REJECT_LOAN', 'loan', id);
    const rejectedClient = await prisma.client.findFirst({ where: { id: loan.clientId, organizationId: req.organization.id }, select: { id: true, email: true } });
    if (rejectedClient?.email) await queueNotification({
      prisma,
      organizationId: req.organization.id,
      clientId: rejectedClient.id,
      recipientEmail: rejectedClient.email,
      eventType: 'LOAN_REJECTED',
      subject: `Loan ${id} rejected`,
      body: `Your loan application ${id} was rejected.`,
    });

    res.json({ updated: 1 });
  } catch (err) {
    return sendServerError(res, err, 'Reject loan error');
  }
};

const disburseLoan = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const { paymentMethod = 'cash', reference, destination } = req.body || {};
    const requestedKey = req.get('Idempotency-Key') || req.body?.idempotencyKey;
    const idempotencyKey = typeof requestedKey === 'string' && requestedKey.trim()
      ? requestedKey.trim().slice(0, 128)
      : `loan-${id}`;
    const validMethods = ['cash', 'mobile_money', 'bank_transfer', 'cheque'];

    if (!id) return res.status(400).json({ error: 'Invalid loan id' });
    if (!validMethods.includes(paymentMethod)) return res.status(400).json({ error: 'Invalid disbursement method' });

    const loan = await getOrganizationLoanById(id, req.organization.id);

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.createdBy === req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Dual control policy: You cannot disburse a loan that you created.' });
    }

    if (loan.status !== 'approved') return res.status(400).json({ error: 'Loan must be approved before disbursement' });

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.loanDisbursement.findUnique({ where: { idempotencyKey } });
      if (existing) {
        if (existing.loanId !== id || existing.organizationId !== req.organization.id) {
          const error = new Error('Idempotency key belongs to another disbursement');
          error.statusCode = 409;
          throw error;
        }
        return { disbursement: existing, alreadyProcessed: true };
      }

      const disbursementStatus = ['cash', 'cheque'].includes(paymentMethod) ? 'SUCCESSFUL' : 'PENDING';
      const completedAt = disbursementStatus === 'SUCCESSFUL' ? new Date() : null;
      const principal = Number(loan.approvedAmount ?? loan.amount);
      const rate = Number(loan.interestRate) / 100;
      const totalWithInterest = principal + (principal * rate * loan.termMonths);
      const balance = Math.round(totalWithInterest * 100) / 100;

      const disbursement = await tx.loanDisbursement.create({
        data: {
          organizationId: req.organization.id,
          loanId: id,
          disbursedBy: req.user.id,
          amount: principal,
          paymentMethod,
          reference: typeof reference === 'string' ? reference.trim().slice(0, 100) || null : null,
          destination: typeof destination === 'string' ? destination.trim().slice(0, 160) || null : null,
          idempotencyKey,
          status: disbursementStatus,
          completedAt,
        },
      });

      if (disbursementStatus === 'SUCCESSFUL') {
        const updatedLoan = await tx.loan.updateMany({
          where: { id, organizationId: req.organization.id, status: 'approved' },
          data: { status: 'disbursed', disbursedAt: completedAt, balance },
        });
        if (updatedLoan.count !== 1) {
          const error = new Error('Loan status changed before disbursement completed');
          error.statusCode = 409;
          throw error;
        }
        await postJournalEntry(tx, {
          organizationId: req.organization.id,
          createdBy: req.user.id,
          entryType: 'LOAN_DISBURSEMENT',
          referenceType: 'loan_disbursement',
          referenceId: disbursement.id,
          debitAccount: 'LOAN_RECEIVABLE',
          creditAccount: 'CASH',
          amount: principal,
          description: `Disbursement for loan ${id}`,
        });
      }

      return { disbursement, alreadyProcessed: false };
    });

    if (!result.alreadyProcessed) {
      await logAudit(req.user.id, 'DISBURSE_LOAN', 'loan', id);
      const disbursedClient = await prisma.client.findFirst({ where: { id: loan.clientId, organizationId: req.organization.id }, select: { id: true, email: true } });
      if (disbursedClient?.email) await queueNotification({
        prisma,
        organizationId: req.organization.id,
        clientId: disbursedClient.id,
        recipientEmail: disbursedClient.email,
        eventType: 'LOAN_DISBURSED',
        subject: `Loan ${id} disbursement ${result.disbursement.status.toLowerCase()}`,
        body: `Loan ${id} disbursement status: ${result.disbursement.status}.`,
      });
    }

    res.json({
      updated: result.disbursement.status === 'SUCCESSFUL' ? 1 : 0,
      disbursementId: result.disbursement.id,
      status: result.disbursement.status,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return sendServerError(res, err, 'Disburse loan error');
  }
};

const requestRevisionLoan = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const { revisionReason } = req.body;

    if (!id) return res.status(400).json({ error: 'Invalid loan id' });

    const loan = await getOrganizationLoanById(id, req.organization.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.createdBy === req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Dual control policy: You cannot mark for revision a loan that you created.' });
    }
    if (loan.status !== 'applied') return res.status(400).json({ error: 'Only applied loans can be marked for revision' });

    const sanitizedRevisionReason = optionalTrimmedString(revisionReason, 1000);
    if (!sanitizedRevisionReason) {
      return res.status(400).json({ error: 'Revision reason is required and must be valid' });
    }

    await prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.updateMany({
        where: { id, organizationId: req.organization.id, status: 'applied' },
        data: {
          status: 'revision_requested',
          revisionReason: sanitizedRevisionReason,
        },
      });
      if (updatedLoan.count !== 1) {
        const error = new Error('Loan status changed before the revision request was recorded.');
        error.status = 409;
        error.expose = true;
        throw error;
      }
      await tx.loanApproval.create({
        data: {
          loanId: id,
          approverId: req.user.id,
          decision: 'REVISION_REQUESTED',
          comments: sanitizedRevisionReason,
        },
      });
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

    const loan = await getOrganizationLoanById(id, req.organization.id);
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
