const express = require('express');
const router = express.Router();
const { createLoan, getLoans, approveLoan, rejectLoan, disburseLoan, getLoanSchedule, requestRevisionLoan } = require('../controllers/loanController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.post('/', authenticateToken, authorizeRole('admin', 'loan_officer'), createLoan);
router.get('/', authenticateToken, authorizeRole('admin', 'loan_officer', 'branch_manager', 'client'), getLoans);
router.post('/:id/approve', authenticateToken, authorizeRole('admin', 'branch_manager'), approveLoan);
router.post('/:id/reject', authenticateToken, authorizeRole('admin', 'branch_manager'), rejectLoan);
router.post('/:id/request-revision', authenticateToken, authorizeRole('admin', 'branch_manager'), requestRevisionLoan);
router.post('/:id/disburse', authenticateToken, authorizeRole('admin', 'cashier'), disburseLoan);
router.get('/:id/schedule', authenticateToken, authorizeRole('admin', 'loan_officer', 'cashier', 'branch_manager'), getLoanSchedule);

module.exports = router;