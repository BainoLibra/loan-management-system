const express = require('express');
const router = express.Router();
const { register, login, changePassword, forgotPassword, resetPassword, verifyEmail } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/change-password', authenticateToken, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

module.exports = router;
