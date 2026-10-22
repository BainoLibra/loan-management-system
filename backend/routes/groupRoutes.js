const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { resolveOrganization } = require('../middleware/organization');
const { createGroup, getGroups, getGroupById, updateGroup, deleteGroup, updateGroupMembers, getGroupCollectionSheet } = require('../controllers/groupController');
const { batchGroupRepayment } = require('../controllers/repaymentController');

router.post('/', authenticateToken, resolveOrganization, authorizeRole('admin', 'loan_officer'), createGroup);
router.get('/', authenticateToken, resolveOrganization, getGroups);
router.get('/:id', authenticateToken, resolveOrganization, getGroupById);
router.get('/:id/collection-sheet', authenticateToken, resolveOrganization, authorizeRole('admin', 'loan_officer', 'cashier', 'branch_manager'), getGroupCollectionSheet);
router.post('/:id/batch-repay', authenticateToken, resolveOrganization, authorizeRole('admin', 'loan_officer', 'cashier'), batchGroupRepayment);
router.put('/:id', authenticateToken, resolveOrganization, authorizeRole('admin', 'loan_officer'), updateGroup);
router.put('/:id/members', authenticateToken, resolveOrganization, authorizeRole('admin', 'loan_officer'), updateGroupMembers);
router.delete('/:id', authenticateToken, resolveOrganization, authorizeRole('admin'), deleteGroup);

module.exports = router;
