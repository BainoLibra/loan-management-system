const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createGroup, getGroups, getGroupById, updateGroup, deleteGroup } = require('../controllers/groupController');

router.post('/', auth, createGroup);
router.get('/', auth, getGroups);
router.get('/:id', auth, getGroupById);
router.put('/:id', auth, updateGroup);
router.delete('/:id', auth, deleteGroup);

module.exports = router;
