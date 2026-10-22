const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');
const { optionalTrimmedString, parseFiniteNumber, parsePositiveInt, sendServerError } = require('../utils/http');

const parseProductPayload = (body) => {
  const name = optionalTrimmedString(body.name, 120);
  const code = optionalTrimmedString(body.code, 40)?.toUpperCase();
  const minAmount = parseFiniteNumber(body.minAmount);
  const maxAmount = parseFiniteNumber(body.maxAmount);
  const interestRate = parseFiniteNumber(body.interestRate);
  const minTermMonths = parsePositiveInt(body.minTermMonths);
  const maxTermMonths = parsePositiveInt(body.maxTermMonths);
  const approvalLimit = parseFiniteNumber(body.approvalLimit);
  const repaymentFrequency = body.repaymentFrequency || 'MONTHLY';

  if (!name || !code || minAmount == null || maxAmount == null || interestRate == null
    || !minTermMonths || !maxTermMonths || approvalLimit == null) {
    return { error: 'name, code, amount limits, interest rate, term limits, and approval limit are required' };
  }
  if (minAmount <= 0 || maxAmount < minAmount || interestRate < 0 || interestRate > 100
    || maxTermMonths < minTermMonths || approvalLimit <= 0) {
    return { error: 'Invalid product limits or interest rate' };
  }
  if (!['WEEKLY', 'MONTHLY'].includes(repaymentFrequency)) {
    return { error: 'repaymentFrequency must be WEEKLY or MONTHLY' };
  }
  return { value: { name, code, minAmount, maxAmount, interestRate, minTermMonths, maxTermMonths, approvalLimit, repaymentFrequency } };
};

const getLoanProducts = async (req, res) => {
  try {
    const products = await prisma.loanProduct.findMany({
      where: { organizationId: req.organization.id },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (err) {
    return sendServerError(res, err, 'List loan products error');
  }
};

const createLoanProduct = async (req, res) => {
  try {
    const parsed = parseProductPayload(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const product = await prisma.loanProduct.create({
      data: { organizationId: req.organization.id, ...parsed.value },
    });
    await logAudit(req.user.id, 'CREATE_LOAN_PRODUCT', 'loan_product', product.id);
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Product code already exists in this organization' });
    return sendServerError(res, err, 'Create loan product error');
  }
};

const updateLoanProduct = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid product id' });
    const parsed = parseProductPayload(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const existing = await prisma.loanProduct.findFirst({ where: { id, organizationId: req.organization.id } });
    if (!existing) return res.status(404).json({ error: 'Loan product not found' });
    const product = await prisma.loanProduct.update({ where: { id }, data: parsed.value });
    await logAudit(req.user.id, 'UPDATE_LOAN_PRODUCT', 'loan_product', id);
    res.json(product);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Product code already exists in this organization' });
    return sendServerError(res, err, 'Update loan product error');
  }
};

module.exports = { getLoanProducts, createLoanProduct, updateLoanProduct };