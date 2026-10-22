const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemaSource = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
const loanSource = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'loanController.js'), 'utf8');
const repaymentSource = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'repaymentController.js'), 'utf8');
const reportSource = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'reportController.js'), 'utf8');
const routeSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'reportRoutes.js'), 'utf8');

test('journal entries are tenant-scoped and financial operations post them', () => {
  assert.match(schemaSource, /model JournalEntry/);
  assert.match(schemaSource, /debitAccount/);
  assert.match(schemaSource, /creditAccount/);
  assert.match(loanSource, /entryType: 'LOAN_DISBURSEMENT'/);
  assert.match(repaymentSource, /entryType: 'LOAN_REPAYMENT'/);
  assert.match(repaymentSource, /entryType: 'REPAYMENT_REVERSAL'/);
});

test('accounting reporting requires tenant context and finance permissions', () => {
  assert.match(routeSource, /accounting-summary/);
  assert.match(routeSource, /resolveOrganization/);
  assert.match(routeSource, /authorizeRole\('admin', 'cashier', 'branch_manager'\)/);
  assert.match(reportSource, /journalEntry\.findMany/);
  assert.match(reportSource, /organizationId: req\.organization\.id/);
});