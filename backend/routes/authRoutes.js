const express = require('express');
const router = express.Router();
const { login, changePassword, forgotPassword, resetPassword, verifyEmail } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public self-registration is disabled; user accounts must be provisioned by an administrator via /api/users
router.post('/register', (_req, res) => {
  return res.status(403).json({
    error: 'Public registration is disabled. Please contact your system administrator to create an account.'
  });
});

router.post('/login', login);
router.post('/change-password', authenticateToken, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

module.exports = router;

