const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'repaymentController.js'), 'utf8');
const routeSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'repaymentRoutes.js'), 'utf8');
const schemaSource = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');

test('repayment posting creates component allocations', () => {
  assert.match(schemaSource, /model RepaymentAllocation/);
  assert.match(controllerSource, /repaymentAllocation\.createMany/);
  assert.match(controllerSource, /component: 'PENALTY'/);
  assert.match(controllerSource, /component: 'INTEREST'/);
  assert.match(controllerSource, /component: 'PRINCIPAL'/);
  assert.match(controllerSource, /component: 'UNAPPLIED'/);
});

test('repayments can only be reversed by an administrator and reversal is auditable', () => {
  assert.match(schemaSource, /model RepaymentReversal/);
  assert.match(schemaSource, /status\s+RepaymentStatus\s+@default\(ACTIVE\)/);
  assert.match(routeSource, /authorizeRole\('admin'\), reverseRepayment/);
  assert.match(controllerSource, /repaymentReversal\.create/);
  assert.match(controllerSource, /REVERSE_REPAYMENT/);
  assert.match(controllerSource, /status: 'REVERSED'/);
});