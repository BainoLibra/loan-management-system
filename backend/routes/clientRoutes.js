const express = require('express');
const router = express.Router();
const { createClient, getClients, getClientById, updateClient, deleteClient } = require('../controllers/clientController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.post('/', authenticateToken, authorizeRole('admin', 'loan_officer'), createClient);
router.get('/', authenticateToken, authorizeRole('admin', 'loan_officer'), getClients);
router.get('/:id', authenticateToken, authorizeRole('admin', 'loan_officer'), getClientById);
router.put('/:id', authenticateToken, authorizeRole('admin', 'loan_officer'), updateClient);
router.delete('/:id', authenticateToken, authorizeRole('admin'), deleteClient);

module.exports = router;