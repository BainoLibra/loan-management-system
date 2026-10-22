const express = require('express');
const router = express.Router();
const { getAgingReport, getDashboardSummary, getAccountingSummary } = require('../controllers/reportController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { resolveOrganization } = require('../middleware/organization');

router.get('/aging', authenticateToken, resolveOrganization, authorizeRole('admin', 'cashier', 'loan_officer', 'branch_manager'), getAgingReport);
router.get('/summary', authenticateToken, resolveOrganization, authorizeRole('admin', 'cashier', 'loan_officer', 'branch_manager'), getDashboardSummary);
router.get('/accounting-summary', authenticateToken, resolveOrganization, authorizeRole('admin', 'cashier', 'branch_manager'), getAccountingSummary);

module.exports = router;