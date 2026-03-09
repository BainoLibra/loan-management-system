const express = require('express');
const router = express.Router();
const { repayLoan, getRepayments } = require('../controllers/repaymentController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.post('/:loanId/repay', authenticateToken, authorizeRole('admin', 'cashier'), repayLoan);
router.get('/:loanId', authenticateToken, authorizeRole('admin', 'cashier', 'loan_officer'), getRepayments);

module.exports = router;