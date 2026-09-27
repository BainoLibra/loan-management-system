const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const groupRoutesPath = path.join(__dirname, '..', 'routes', 'groupRoutes.js');
const routeSource = fs.readFileSync(groupRoutesPath, 'utf8');

test('loan officers can create and manage their own groups, but only admins can delete groups', () => {
  assert.match(routeSource, /router\.post\('\/', authenticateToken, authorizeRole\('admin', 'loan_officer'\), createGroup\);/);
  assert.match(routeSource, /router\.put\('\/:id', authenticateToken, authorizeRole\('admin', 'loan_officer'\), updateGroup\);/);
  assert.match(routeSource, /router\.put\('\/:id\/members', authenticateToken, authorizeRole\('admin', 'loan_officer'\), updateGroupMembers\);/);
  assert.match(routeSource, /router\.delete\('\/:id', authenticateToken, authorizeRole\('admin'\), deleteGroup\);/);
});
