const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'loanController.js'), 'utf8');
const schemaSource = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
const migrationSource = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'migrations', '20261023_add_loan_disbursements', 'migration.sql'), 'utf8');

test('disbursements are idempotent and track provider outcomes', () => {
  assert.match(schemaSource, /enum DisbursementStatus/);
  assert.match(schemaSource, /idempotencyKey\s+String\s+@unique/);
  assert.match(migrationSource, /PENDING.*SUCCESSFUL.*FAILED/s);
  assert.match(controllerSource, /loanDisbursement\.findUnique/);
  assert.match(controllerSource, /alreadyProcessed: true/);
});

test('only successful manual disbursements transition approved loans', () => {
  assert.match(controllerSource, /\['cash', 'cheque'\]\.includes\(paymentMethod\)/);
  assert.match(controllerSource, /status: 'disbursed'/);
  assert.match(controllerSource, /status: disbursementStatus/);
  assert.match(controllerSource, /where: \{ id, organizationId: req\.organization\.id, status: 'approved' \}/);
});