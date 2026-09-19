const express = require('express');
const router = express.Router();
const { register, login, changePassword, forgotPassword, resetPassword, verifyEmail } = require('../controllers/authController');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

router.post('/register', optionalAuthenticateToken, register);
router.post('/login', login);
router.post('/change-password', authenticateToken, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

module.exports = router;
