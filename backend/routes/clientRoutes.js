const express = require('express');
const router = express.Router();
const { createClient, getClients, getClientById, updateClient, deleteClient } = require('../controllers/clientController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { resolveOrganization } = require('../middleware/organization');

router.post('/', authenticateToken, resolveOrganization, authorizeRole('admin', 'loan_officer'), createClient);
router.get('/', authenticateToken, resolveOrganization, authorizeRole('admin', 'loan_officer'), getClients);
router.get('/:id', authenticateToken, resolveOrganization, authorizeRole('admin', 'loan_officer'), getClientById);
router.put('/:id', authenticateToken, resolveOrganization, authorizeRole('admin', 'loan_officer'), updateClient);
router.delete('/:id', authenticateToken, resolveOrganization, authorizeRole('admin'), deleteClient);

module.exports = router;