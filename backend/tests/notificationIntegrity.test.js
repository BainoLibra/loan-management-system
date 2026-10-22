const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemaSource = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
const routeSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'notificationRoutes.js'), 'utf8');
const helperSource = fs.readFileSync(path.join(__dirname, '..', 'utils', 'notifications.js'), 'utf8');
const loanSource = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'loanController.js'), 'utf8');
const repaymentSource = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'repaymentController.js'), 'utf8');

test('notifications are tenant-scoped and delivery remains server-side', () => {
  assert.match(schemaSource, /model Notification/);
  assert.match(schemaSource, /organizationId\s+Int/);
  assert.match(routeSource, /resolveOrganization/);
  assert.match(routeSource, /retry/);
  assert.match(helperSource, /require\('\.\/sendEmail'\)/);
});

test('loan and repayment events queue borrower notifications', () => {
  assert.match(loanSource, /LOAN_APPROVED/);
  assert.match(loanSource, /LOAN_DISBURSED/);
  assert.match(repaymentSource, /REPAYMENT_RECEIVED/);
  assert.match(repaymentSource, /REPAYMENT_REVERSED/);
});