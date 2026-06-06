const express = require('express');
const router = express.Router();
const { getAgingReport, getDashboardSummary } = require('../controllers/reportController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.get('/aging', authenticateToken, authorizeRole('admin', 'cashier', 'loan_officer', 'branch_manager'), getAgingReport);
router.get('/summary', authenticateToken, authorizeRole('admin', 'cashier', 'loan_officer', 'branch_manager'), getDashboardSummary);

module.exports = router;