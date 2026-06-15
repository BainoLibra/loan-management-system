const { prisma } = require('../db');
const { logAudit } = require('../utils/hash');
const { canAccessClient, canManageGroup, getClientAccessWhere } = require('../utils/accessControl');
const { normalizeEmail, parsePositiveInt, sendServerError } = require('../utils/http');

const titleCaseName = (value) => {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : "")
    .join(" ");
};

const normalizePhoneNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (/^0\d{9}$/.test(digits)) return `256${digits.slice(1)}`;
  if (/^256\d{9}$/.test(digits)) return digits;
  return digits;
};

const validateClientPayload = ({ firstName, lastName, phone, email, identifier, guarantorName, guarantorPhone, guarantorId, address }) => {
  if (!String(firstName || "").trim()) return "First name is required.";
  if (!String(lastName || "").trim()) return "Last name is required.";
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(firstName)) return "First name may only contain letters and spaces.";
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(lastName)) return "Last name may only contain letters and spaces.";
  if (phone && !/^256\d{9}$/.test(phone)) return "Phone must be in format 256XXXXXXXXX or 07XXXXXXXX.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format.";
  if (identifier && !/^[A-Z0-9]{1,14}$/.test(identifier)) return "Identifier must be up to 14 characters of uppercase letters and digits only.";
  if (guarantorName && !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(guarantorName)) return "Guarantor name may only contain letters and spaces.";
  if (guarantorPhone && !/^256\d{9}$/.test(guarantorPhone)) return "Guarantor phone must be in format 256XXXXXXXXX or 07XXXXXXXX.";
  if (guarantorId && !/^[A-Z0-9]{1,14}$/.test(guarantorId)) return "Guarantor ID must be up to 14 characters of uppercase letters and digits only.";
  if (address && address.length > 255) return "Address must be under 255 characters.";
  return "";
};

const createClient = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, identifier, groupId, guarantorName, guarantorPhone, guarantorId, address } = req.body;
    const formattedFirstName = titleCaseName(firstName);
    const formattedLastName = titleCaseName(lastName);
    const formattedGuarantorName = titleCaseName(guarantorName);
    const normalizedPhone = normalizePhoneNumber(phone);
    const normalizedGuarantorPhone = normalizePhoneNumber(guarantorPhone);
    const normalizedEmail = normalizeEmail(email);
    const parsedGroupId = groupId ? parsePositiveInt(groupId) : null;
    if (groupId && !parsedGroupId) return res.status(400).json({ error: 'Invalid group id.' });

    const validationError = validateClientPayload({
      firstName: formattedFirstName,
      lastName: formattedLastName,
      phone: normalizedPhone,
      email: normalizedEmail,
      identifier,
      guarantorName: formattedGuarantorName,
      guarantorPhone: normalizedGuarantorPhone,
      guarantorId,
      address,
    });
    if (validationError) return res.status(400).json({ error: validationError });

    if (parsedGroupId) {
      const group = await prisma.group.findUnique({ where: { id: parsedGroupId } });
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (!await canManageGroup(req.user, parsedGroupId)) {
        return res.status(403).json({ error: 'Cannot assign client to a group you do not manage.' });
      }
    }

    const client = await prisma.client.create({
      data: {
        firstName: formattedFirstName,
        lastName: formattedLastName,
        phone: normalizedPhone || null,
        email: normalizedEmail,
        identifier,
        address,
        groupId: parsedGroupId,
        guarantorName: formattedGuarantorName,
        guarantorPhone: normalizedGuarantorPhone || null,
        guarantorId,
      },
    });

    await logAudit(req.user.id, 'CREATE_CLIENT', 'client', client.id);

    res.json({ id: client.id });
  } catch (err) {
    return sendServerError(res, err, 'Create client error');
  }
};

const getClients = async (req, res) => {
  try {
    const where = await getClientAccessWhere(req.user);
    const rows = await prisma.client.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(rows);
  } catch (err) {
    return sendServerError(res, err, 'List clients error');
  }
};

const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = parsePositiveInt(id);
    if (!clientId) return res.status(400).json({ error: 'Invalid client id' });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        loans: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!await canAccessClient(req.user, clientId)) {
      return res.status(403).json({ error: 'You do not have access to this client' });
    }

    res.json(client);
  } catch (err) {
    return sendServerError(res, err, 'Get client error');
  }
};

const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, email, identifier, groupId, guarantorName, guarantorPhone, guarantorId, address } = req.body;
    const formattedFirstName = titleCaseName(firstName);
    const formattedLastName = titleCaseName(lastName);
    const formattedGuarantorName = titleCaseName(guarantorName);
    const normalizedPhone = normalizePhoneNumber(phone);
    const normalizedGuarantorPhone = normalizePhoneNumber(guarantorPhone);
    const clientId = parsePositiveInt(id);
    const normalizedEmail = normalizeEmail(email);
    const parsedGroupId = groupId ? parsePositiveInt(groupId) : null;

    if (!clientId) return res.status(400).json({ error: 'Invalid client id' });
    if (groupId && !parsedGroupId) return res.status(400).json({ error: 'Invalid group id.' });

    const validationError = validateClientPayload({
      firstName: formattedFirstName,
      lastName: formattedLastName,
      phone: normalizedPhone,
      email: normalizedEmail,
      identifier,
      guarantorName: formattedGuarantorName,
      guarantorPhone: normalizedGuarantorPhone,
      guarantorId,
      address,
    });
    if (validationError) return res.status(400).json({ error: validationError });

    const existingClient = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existingClient) return res.status(404).json({ error: 'Client not found' });
    if (!await canAccessClient(req.user, clientId)) {
      return res.status(403).json({ error: 'You do not have access to this client' });
    }

    if (req.user.role !== 'admin') {
      const nameOrIdentifierChanged =
        formattedFirstName !== existingClient.firstName ||
        formattedLastName !== existingClient.lastName ||
        String(identifier || '') !== String(existingClient.identifier || '');

      if (nameOrIdentifierChanged) {
        return res.status(403).json({ error: 'Only admins can edit client names or identifier.' });
      }
    }

    if (parsedGroupId) {
      const group = await prisma.group.findUnique({ where: { id: parsedGroupId } });
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (!await canManageGroup(req.user, parsedGroupId)) {
        return res.status(403).json({ error: 'Cannot assign client to a group you do not manage.' });
      }
    }

    await prisma.client.update({
      where: { id: clientId },
      data: {
        firstName: formattedFirstName,
        lastName: formattedLastName,
        phone: normalizedPhone || null,
        email: normalizedEmail,
        identifier,
        address,
        groupId: parsedGroupId,
        guarantorName: formattedGuarantorName,
        guarantorPhone: normalizedGuarantorPhone || null,
        guarantorId,
      },
    });

    await logAudit(req.user.id, 'UPDATE_CLIENT', 'client', clientId);
    res.json({ updated: 1 });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Client not found' });
    }
    return sendServerError(res, err, 'Update client error');
  }
};

const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = parsePositiveInt(id);

    if (!clientId) return res.status(400).json({ error: 'Invalid client id' });

    // Check if client has loans
    const loans = await prisma.loan.count({ where: { clientId } });
    if (loans > 0) {
      return res.status(400).json({ error: 'Cannot delete client with existing loans' });
    }

    await prisma.client.delete({ where: { id: clientId } });
    await logAudit(req.user.id, 'DELETE_CLIENT', 'client', clientId);
    res.json({ deleted: 1 });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Client not found' });
    }
    return sendServerError(res, err, 'Delete client error');
  }
};

module.exports = { createClient, getClients, getClientById, updateClient, deleteClient };
