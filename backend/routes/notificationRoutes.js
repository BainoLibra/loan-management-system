const express = require('express');
const router = express.Router();
const { getNotifications, retryNotification } = require('../controllers/notificationController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { resolveOrganization } = require('../middleware/organization');

router.get('/', authenticateToken, resolveOrganization, getNotifications);
router.post('/:id/retry', authenticateToken, resolveOrganization, authorizeRole('admin'), retryNotification);

module.exports = router;
