const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { createGroup, getGroups, getGroupById, updateGroup, deleteGroup, updateGroupMembers, getGroupCollectionSheet } = require('../controllers/groupController');
const { batchGroupRepayment } = require('../controllers/repaymentController');

router.post('/', authenticateToken, authorizeRole('admin', 'loan_officer'), createGroup);
router.get('/', authenticateToken, getGroups);
router.get('/:id', authenticateToken, getGroupById);
router.get('/:id/collection-sheet', authenticateToken, authorizeRole('admin', 'loan_officer', 'cashier', 'branch_manager'), getGroupCollectionSheet);
router.post('/:id/batch-repay', authenticateToken, authorizeRole('admin', 'loan_officer', 'cashier'), batchGroupRepayment);
router.put('/:id', authenticateToken, authorizeRole('admin', 'loan_officer'), updateGroup);
router.put('/:id/members', authenticateToken, authorizeRole('admin', 'loan_officer'), updateGroupMembers);
router.delete('/:id', authenticateToken, authorizeRole('admin', 'loan_officer'), deleteGroup);

module.exports = router;
