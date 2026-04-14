const bcrypt = require('bcrypt');
const { prisma } = require('../db');

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const logAudit = async (userId, action, entity, entityId) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId: userId == null ? null : Number(userId),
                action,
                entity,
                entityId: entityId == null ? null : Number(entityId),
            },
        });
    } catch (err) {
        console.error('Audit log error:', err);
    }
};

module.exports = { hashPassword, logAudit };