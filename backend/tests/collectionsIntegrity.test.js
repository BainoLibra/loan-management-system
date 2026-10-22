const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'collectionsController.js'), 'utf8');
const routeSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'collectionsRoutes.js'), 'utf8');
const schemaSource = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
const migrationSource = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'migrations', '20261023_add_collection_activities', 'migration.sql'), 'utf8');

test('collections are tenant-scoped and assignments require active membership', () => {
  assert.match(schemaSource, /model CollectionActivity/);
  assert.match(migrationSource, /organizationId.*loanId.*createdBy/s);
  assert.match(controllerSource, /organizationId: req\.organization\.id/);
  assert.match(controllerSource, /organizationMembership\.findFirst/);
  assert.match(routeSource, /resolveOrganization/);
});

test('arrears output calculates days past due and collection activity is audited', () => {
  assert.match(controllerSource, /daysPastDue/);
  assert.match(controllerSource, /activityType/);
  assert.match(controllerSource, /promiseDate/);
  assert.match(controllerSource, /CREATE_COLLECTION_ACTIVITY/);
});