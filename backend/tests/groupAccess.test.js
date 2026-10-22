const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const groupRoutesPath = path.join(__dirname, '..', 'routes', 'groupRoutes.js');
const routeSource = fs.readFileSync(groupRoutesPath, 'utf8');

test('loan officers can manage groups only within an active organization, but only admins can delete groups', () => {
  assert.match(routeSource, /router\.post\('\/', authenticateToken, resolveOrganization, authorizeRole\('admin', 'loan_officer'\), createGroup\);/);
  assert.match(routeSource, /router\.put\('\/:id', authenticateToken, resolveOrganization, authorizeRole\('admin', 'loan_officer'\), updateGroup\);/);
  assert.match(routeSource, /router\.put\('\/:id\/members', authenticateToken, resolveOrganization, authorizeRole\('admin', 'loan_officer'\), updateGroupMembers\);/);
  assert.match(routeSource, /router\.delete\('\/:id', authenticateToken, resolveOrganization, authorizeRole\('admin'\), deleteGroup\);/);
});
