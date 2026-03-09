const express = require('express');
const router = express.Router();
const { getAgingReport } = require('../controllers/reportController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.get('/aging', authenticateToken, authorizeRole('admin', 'cashier', 'loan_officer'), getAgingReport);

module.exports = router;