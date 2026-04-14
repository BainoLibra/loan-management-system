const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');

const createClient = async (req, res) => {
  try {
    const { name, phone, email, identifier } = req.body;

    const client = await prisma.client.create({
      data: { name, phone, email, identifier },
    });

    await logAudit(req.user.id, 'CREATE_CLIENT', 'client', client.id);

    res.json({ id: client.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getClients = async (req, res) => {
  try {
    const rows = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: Number(id) },
      include: {
        loans: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) return res.status(404).json({ error: 'Client not found' });

    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, identifier } = req.body;

    await prisma.client.update({
      where: { id: Number(id) },
      data: { name, phone, email, identifier },
    });

    await logAudit(req.user.id, 'UPDATE_CLIENT', 'client', id);
    res.json({ updated: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client has loans
    const loans = await prisma.loan.count({ where: { clientId: Number(id) } });
    if (loans > 0) {
      return res.status(400).json({ error: 'Cannot delete client with existing loans' });
    }

    await prisma.client.delete({ where: { id: Number(id) } });
    await logAudit(req.user.id, 'DELETE_CLIENT', 'client', id);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createClient, getClients, getClientById, updateClient, deleteClient };
