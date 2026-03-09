const express = require('express');
const router = express.Router();
const { createClient, getClients } = require('../controllers/clientController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.post('/', authenticateToken, authorizeRole('admin', 'loan_officer'), createClient);
router.get('/', authenticateToken, authorizeRole('admin', 'loan_officer'), getClients);

module.exports = router;