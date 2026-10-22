const express = require('express');
const router = express.Router();
const { repayLoan, getRepayments, reverseRepayment, getFieldCollectionsSummary, acceptCashHandover } = require('../controllers/repaymentController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { resolveOrganization } = require('../middleware/organization');

router.get('/field-summary', authenticateToken, resolveOrganization, authorizeRole('admin', 'cashier', 'branch_manager'), getFieldCollectionsSummary);
router.post('/handover', authenticateToken, resolveOrganization, authorizeRole('admin', 'cashier', 'branch_manager'), acceptCashHandover);
router.post('/:loanId/repay', authenticateToken, resolveOrganization, authorizeRole('admin', 'cashier', 'loan_officer'), repayLoan);
router.post('/:loanId/repayments/:repaymentId/reverse', authenticateToken, resolveOrganization, authorizeRole('admin'), reverseRepayment);
router.get('/:loanId', authenticateToken, resolveOrganization, authorizeRole('admin', 'cashier', 'loan_officer'), getRepayments);

module.exports = router;