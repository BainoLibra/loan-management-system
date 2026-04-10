const express = require('express');
const router = express.Router();
const { register, login, changePassword } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/change-password', auth, changePassword);

module.exports = router;