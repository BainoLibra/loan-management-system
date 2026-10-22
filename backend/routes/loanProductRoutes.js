const express = require('express');
const router = express.Router();
const { getLoanProducts, createLoanProduct, updateLoanProduct } = require('../controllers/loanProductController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { resolveOrganization } = require('../middleware/organization');

router.get('/', authenticateToken, resolveOrganization, getLoanProducts);
router.post('/', authenticateToken, resolveOrganization, authorizeRole('admin'), createLoanProduct);
router.put('/:id', authenticateToken, resolveOrganization, authorizeRole('admin'), updateLoanProduct);

module.exports = router;