const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { createGroup, getGroups, getGroupById, updateGroup, deleteGroup, updateGroupMembers } = require('../controllers/groupController');

router.post('/', authenticateToken, authorizeRole('admin', 'loan_officer'), createGroup);
router.get('/', authenticateToken, getGroups);
router.get('/:id', authenticateToken, getGroupById);
router.put('/:id', authenticateToken, authorizeRole('admin'), updateGroup);
router.put('/:id/members', authenticateToken, authorizeRole('admin'), updateGroupMembers);
router.delete('/:id', authenticateToken, authorizeRole('admin'), deleteGroup);

module.exports = router;
