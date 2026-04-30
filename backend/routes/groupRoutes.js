const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createGroup, getGroups, getGroupById, updateGroup, deleteGroup, updateGroupMembers } = require('../controllers/groupController');

router.post('/', authenticateToken, createGroup);
router.get('/', authenticateToken, getGroups);
router.get('/:id', authenticateToken, getGroupById);
router.put('/:id', authenticateToken, updateGroup);
router.put('/:id/members', authenticateToken, updateGroupMembers);
router.delete('/:id', authenticateToken, deleteGroup);

module.exports = router;
