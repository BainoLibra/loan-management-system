const express = require('express');
const router = express.Router();
const { createLoan, getLoans, approveLoan, disburseLoan } = require('../controllers/loanController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.post('/', authenticateToken, authorizeRole('admin', 'loan_officer'), createLoan);
router.get('/', authenticateToken, authorizeRole('admin', 'loan_officer', 'client'), getLoans);
router.post('/:id/approve', authenticateToken, authorizeRole('admin'), approveLoan);
router.post('/:id/disburse', authenticateToken, authorizeRole('admin', 'cashier'), disburseLoan);

module.exports = router;