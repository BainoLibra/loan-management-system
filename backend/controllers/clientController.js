const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');

const titleCaseName = (value) => {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : "")
    .join(" ");
};

const validateClientPayload = ({ firstName, lastName, phone, identifier, guarantorName, guarantorPhone, guarantorId }) => {
  if (!String(firstName || "").trim()) return "First name is required.";
  if (!String(lastName || "").trim()) return "Last name is required.";
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(firstName)) return "First name may only contain letters and spaces.";
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(lastName)) return "Last name may only contain letters and spaces.";
  if (phone && !/^256\d{9}$/.test(phone)) return "Phone must start with 256 and be 12 digits long.";
  if (identifier && !/^[A-Z0-9]{1,14}$/.test(identifier)) return "Identifier must be up to 14 characters of uppercase letters and digits only.";
  if (guarantorName && !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(guarantorName)) return "Guarantor name may only contain letters and spaces.";
  if (guarantorPhone && !/^256\d{9}$/.test(guarantorPhone)) return "Guarantor phone must start with 256 and be 12 digits long.";
  if (guarantorId && !/^[A-Z0-9]{1,14}$/.test(guarantorId)) return "Guarantor ID must be up to 14 characters of uppercase letters and digits only.";
  return "";
};

const createClient = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, identifier, groupId, guarantorName, guarantorPhone, guarantorId, address } = req.body;
    const formattedFirstName = titleCaseName(firstName);
    const formattedLastName = titleCaseName(lastName);
    const formattedGuarantorName = titleCaseName(guarantorName);
    const validationError = validateClientPayload({
      firstName: formattedFirstName,
      lastName: formattedLastName,
      phone,
      identifier,
      guarantorName: formattedGuarantorName,
      guarantorPhone,
      guarantorId,
    });
    if (validationError) return res.status(400).json({ error: validationError });

    const client = await prisma.client.create({
      data: {
        firstName: formattedFirstName,
        lastName: formattedLastName,
        phone,
        email,
        identifier,
        address,
        groupId: groupId ? Number(groupId) : null,
        guarantorName: formattedGuarantorName,
        guarantorPhone,
        guarantorId,
      },
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
    const { firstName, lastName, phone, email, identifier, groupId, guarantorName, guarantorPhone, guarantorId, address } = req.body;
    const formattedFirstName = titleCaseName(firstName);
    const formattedLastName = titleCaseName(lastName);
    const formattedGuarantorName = titleCaseName(guarantorName);
    const validationError = validateClientPayload({
      firstName: formattedFirstName,
      lastName: formattedLastName,
      phone,
      identifier,
      guarantorName: formattedGuarantorName,
      guarantorPhone,
      guarantorId,
    });
    if (validationError) return res.status(400).json({ error: validationError });

    await prisma.client.update({
      where: { id: Number(id) },
      data: {
        firstName: formattedFirstName,
        lastName: formattedLastName,
        phone,
        email,
        identifier,
        address,
        groupId: groupId ? Number(groupId) : null,
        guarantorName: formattedGuarantorName,
        guarantorPhone,
        guarantorId,
      },
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
