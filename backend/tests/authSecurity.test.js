const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');

// 1. Static route verification
test('public self-registration is disabled and user creation is restricted to admin', () => {
  const authRoutesPath = path.join(__dirname, '..', 'routes', 'authRoutes.js');
  const authRoutesSource = fs.readFileSync(authRoutesPath, 'utf8');

  // Verify public /register returns 403 Forbidden
  assert.match(authRoutesSource, /Public registration is disabled/i);
  assert.match(authRoutesSource, /res\.status\(403\)/);

  const userRoutesPath = path.join(__dirname, '..', 'routes', 'userRoutes.js');
  const userRoutesSource = fs.readFileSync(userRoutesPath, 'utf8');

  // Verify /api/users creation requires admin role
  assert.match(userRoutesSource, /router\.post\('\/', authenticateToken, authorizeRole\('admin'\), register\);/);
});

// 2. Auth controller register unit tests
test('register controller rejects non-admin users', async () => {
  const { register } = require('../controllers/authController');

  // Case A: Unauthenticated user
  let statusCode = null;
  let jsonResponse = null;
  const mockRes = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => { jsonResponse = data; return data; }
      };
    }
  };

  await register({ user: null, body: { name: 'Test', email: 'test@example.com', password: 'password123', role: 'loan_officer' } }, mockRes);
  assert.equal(statusCode, 403);
  assert.match(jsonResponse.error, /Only administrators can create new user accounts/i);

  // Case B: Non-admin user (e.g. loan_officer)
  statusCode = null;
  jsonResponse = null;
  await register({ user: { id: 2, role: 'loan_officer' }, body: { name: 'Test', email: 'test@example.com', password: 'password123', role: 'loan_officer' } }, mockRes);
  assert.equal(statusCode, 403);
  assert.match(jsonResponse.error, /Only administrators can create new user accounts/i);
});

// 3. Auth middleware unit tests
test('auth middleware: authorizeRole enforces role boundaries', () => {
  const { authorizeRole } = require('../middleware/auth');

  const adminOnly = authorizeRole('admin');

  // Non-authenticated
  let status = null;
  let json = null;
  const mockRes = {
    status: (s) => { status = s; return { json: (j) => { json = j; } }; }
  };
  let nextCalled = false;

  adminOnly({ user: null }, mockRes, () => { nextCalled = true; });
  assert.equal(status, 401);
  assert.equal(nextCalled, false);

  // Wrong role
  status = null;
  json = null;
  nextCalled = false;
  adminOnly({ user: { id: 3, role: 'cashier' } }, mockRes, () => { nextCalled = true; });
  assert.equal(status, 403);
  assert.equal(nextCalled, false);

  // Correct role
  status = null;
  json = null;
  nextCalled = false;
  adminOnly({ user: { id: 1, role: 'admin' } }, mockRes, () => { nextCalled = true; });
  assert.equal(status, null);
  assert.equal(nextCalled, true);
});

test('auth middleware: authenticateToken rejects missing or malformed token', async () => {
  const { authenticateToken } = require('../middleware/auth');

  let status = null;
  let json = null;
  const mockRes = {
    status: (s) => { status = s; return { json: (j) => { json = j; } }; }
  };

  // Missing header
  await authenticateToken({ headers: {} }, mockRes, () => {});
  assert.equal(status, 401);

  // Malformed header
  status = null;
  await authenticateToken({ headers: { authorization: 'Bearer' } }, mockRes, () => {});
  assert.equal(status, 401);

  // Invalid token
  status = null;
  await authenticateToken({ headers: { authorization: 'Bearer invalid.token.signature' } }, mockRes, () => {});
  assert.equal(status, 403);
});
