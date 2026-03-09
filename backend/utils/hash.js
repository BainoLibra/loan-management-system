const bcrypt = require('bcrypt');
const pool = require('../db');

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const logAudit = async (userId, action, entity, entityId) => {
    try {
        await pool.execute(
            'INSERT INTO audit_logs (userId, action, entity, entityId) VALUES (?, ?, ?, ?)',
            [userId, action, entity, entityId]
        );
    } catch (err) {
        console.error('Audit log error:', err);
    }
};

module.exports = { hashPassword, logAudit };