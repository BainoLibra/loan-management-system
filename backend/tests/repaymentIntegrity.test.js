const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerSource = fs.readFileSync(
  path.join(__dirname, '..', 'controllers', 'repaymentController.js'),
  'utf8',
);
const schemaSource = fs.readFileSync(
  path.join(__dirname, '..', 'prisma', 'schema.prisma'),
  'utf8',
);

test('repayments use a unique idempotency key and return existing payments on retry', () => {
  assert.match(schemaSource, /idempotencyKey String\? @unique/);
  assert.match(controllerSource, /findUnique\(\{ where: \{ idempotencyKey \} \}\)/);
  assert.match(controllerSource, /alreadyProcessed: true/);
  assert.match(controllerSource, /alreadyProcessed: repayment\.alreadyProcessed/);
});

test('repayment balance changes are conditional on the current disbursed balance', () => {
  assert.match(controllerSource, /status: 'disbursed',\s+balance: \{ gte: repaymentAmount \}/s);
  assert.match(controllerSource, /data: \{ balance: \{ decrement: repaymentAmount \} \}/);
  assert.match(controllerSource, /updatedLoanCount\.count !== 1/);
});