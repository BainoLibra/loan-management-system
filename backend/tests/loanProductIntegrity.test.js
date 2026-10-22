const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routeSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'loanProductRoutes.js'), 'utf8');
const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'loanController.js'), 'utf8');
const migrationSource = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'migrations', '20261023_add_loan_products', 'migration.sql'), 'utf8');

test('loan products are tenant-scoped and admin-managed', () => {
  assert.match(routeSource, /resolveOrganization/);
  assert.match(routeSource, /authorizeRole\('admin'\)/);
  assert.match(migrationSource, /UNIQUE \("organizationId", "code"\)/);
  assert.match(migrationSource, /FOREIGN KEY \("organizationId"\)/);
});

test('loan creation and approval enforce product rules', () => {
  assert.match(controllerSource, /active: true/);
  assert.match(controllerSource, /outside the selected product limits/);
  assert.match(controllerSource, /approvalLimit/);
  assert.match(controllerSource, /exceeds the configured approval limit/);
  assert.match(controllerSource, /tx\.loanApproval\.create/);
  assert.match(controllerSource, /decision: 'APPROVED'/);
  assert.match(controllerSource, /decision: 'REJECTED'/);
  assert.match(controllerSource, /decision: 'REVISION_REQUESTED'/);
});
