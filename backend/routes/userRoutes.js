const express = require('express');
const router = express.Router();
const { getUsers, updateUser, resetPassword, deleteUser } = require('../controllers/userController');
const { register } = require('../controllers/authController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.get('/', authenticateToken, authorizeRole('admin'), getUsers);
router.post('/', authenticateToken, authorizeRole('admin'), register);
router.put('/:id', authenticateToken, authorizeRole('admin'), updateUser);
router.post('/:id/reset-password', authenticateToken, authorizeRole('admin'), resetPassword);
router.delete('/:id', authenticateToken, authorizeRole('admin'), deleteUser);

module.exports = router;
