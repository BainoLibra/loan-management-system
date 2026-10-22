const express = require('express');
const router = express.Router();
const { getOverdueLoans, createCollectionActivity, getLoanCollectionActivities } = require('../controllers/collectionsController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { resolveOrganization } = require('../middleware/organization');

router.get('/overdue', authenticateToken, resolveOrganization, authorizeRole('admin', 'cashier', 'loan_officer', 'branch_manager'), getOverdueLoans);
router.post('/:loanId/activities', authenticateToken, resolveOrganization, authorizeRole('admin', 'cashier', 'loan_officer', 'branch_manager'), createCollectionActivity);
router.get('/:loanId/activities', authenticateToken, resolveOrganization, authorizeRole('admin', 'cashier', 'loan_officer', 'branch_manager'), getLoanCollectionActivities);

module.exports = router;