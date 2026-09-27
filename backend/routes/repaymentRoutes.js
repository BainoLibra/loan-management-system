const express = require('express');
const router = express.Router();
const { repayLoan, getRepayments, getFieldCollectionsSummary, acceptCashHandover } = require('../controllers/repaymentController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.get('/field-summary', authenticateToken, authorizeRole('admin', 'cashier', 'branch_manager'), getFieldCollectionsSummary);
router.post('/handover', authenticateToken, authorizeRole('admin', 'cashier', 'branch_manager'), acceptCashHandover);
router.post('/:loanId/repay', authenticateToken, authorizeRole('admin', 'cashier', 'loan_officer'), repayLoan);
router.get('/:loanId', authenticateToken, authorizeRole('admin', 'cashier', 'loan_officer'), getRepayments);

module.exports = router;