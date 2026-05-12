const { prisma } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { isValidEmail, normalizeEmail, sendServerError } = require('../utils/http');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const allowedRoles = ['admin', 'loan_officer', 'cashier'];

const loginAttempts = new Map();

const getFrontendUrl = (req) => {
    return (process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const sendVerificationEmail = async (req, user, token) => {
    const verificationUrl = `${getFrontendUrl(req)}/verify-email?token=${token}`;
    const message = [
        `Hello ${user.name},`,
        '',
        'Please verify your Libra account email address by opening this link:',
        '',
        verificationUrl,
        '',
        'This link expires in 24 hours. If you did not create this account, you can ignore this email.',
    ].join('\n');

    await sendEmail({
        to: user.email,
        subject: 'Verify your Libra account',
        text: message,
    });
};

// REGISTER USER
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const normalizedEmail = normalizeEmail(email);
        
        // Validate required fields
        if (!name || !normalizedEmail || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        // Validate name
        if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
        }

        // Validate email format
        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate password strength
        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        const assignableRoles = req.user?.role === 'admin'
            ? allowedRoles
            : allowedRoles.filter((allowedRole) => allowedRole !== 'admin');
        const selectedRole = role || 'loan_officer';

        if (!assignableRoles.includes(selectedRole)) {
            return res.status(403).json({ error: 'You are not allowed to assign that role' });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const isAdminCreated = req.user?.role === 'admin';
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationToken = isAdminCreated ? null : hashToken(verificationToken);
        const emailVerificationExpires = isAdminCreated ? null : new Date(Date.now() + 24 * 60 * 60 * 1000);

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                role: selectedRole,
                emailVerified: isAdminCreated,
                emailVerifiedAt: isAdminCreated ? new Date() : null,
                emailVerificationToken,
                emailVerificationExpires,
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        if (!isAdminCreated) {
            try {
                await sendVerificationEmail(req, user, verificationToken);
            } catch (error) {
                console.error('Verification email error:', error);
                await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
                return res.status(500).json({ error: 'Verification email could not be sent' });
            }
        }

        res.json({
            message: isAdminCreated
                ? 'User registered successfully'
                : 'Account created. Please check your email to verify your account before signing in.',
            requiresEmailVerification: !isAdminCreated,
        });

    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({
                error: 'Email already exists'
            });
        }
        return sendServerError(res, error, 'Registration error');
    }
};

// LOGIN USER
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || typeof password !== 'string') {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutes
        const maxAttempts = 5;

        const attempts = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
        if (now - attempts.firstAttempt > windowMs) {
            attempts.count = 1;
            attempts.firstAttempt = now;
        } else {
            attempts.count++;
            if (attempts.count > maxAttempts) {
                return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
            }
        }
        loginAttempts.set(ip, attempts);

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
                id: true,
                name: true,
                email: true,
                password: true,
                role: true,
                status: true,
                emailVerified: true,
            },
        });

        if (!user || user.status === 'inactive') {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                message: 'Please verify your email address before signing in.',
                code: 'EMAIL_NOT_VERIFIED',
            });
        }

        // Create Token
        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            SECRET,
            { expiresIn: '1d' }
        );

        // Reset rate limits on success
        loginAttempts.delete(ip);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        return sendServerError(res, error, 'Login error');
    }
};

// CHANGE PASSWORD
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id; // from auth middleware

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        return sendServerError(res, error, 'Change password error');
    }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail) {
            return res.status(400).json({ error: 'Email is required' });
        }

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
                email: true,
            },
        });

        if (!user) {
            // Return success even if user not found for security reasons
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Generate token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordToken = hashToken(resetToken);
        
        // Set expiration (1 hour)
        const resetPasswordExpires = new Date(Date.now() + 3600000);

        // Update user
        await prisma.user.update({
            where: { email: normalizedEmail },
            data: {
                resetPasswordToken,
                resetPasswordExpires,
            },
        });

        // Send email
        const resetUrl = `${getFrontendUrl(req)}/reset-password?token=${resetToken}`;
        const message = `You requested a password reset. Please click the link to reset your password: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Password Reset Request',
                text: message,
            });

            res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        } catch (error) {
            console.error('Email error:', error);
            // Revert the token if email fails
            await prisma.user.update({
                where: { email: normalizedEmail },
                data: {
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                },
            });
            return res.status(500).json({ error: 'Email could not be sent' });
        }

    } catch (error) {
        return sendServerError(res, error, 'Forgot password error');
    }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Hash token to compare with database
        const resetPasswordToken = hashToken(token);

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken,
                resetPasswordExpires: { gt: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired password reset token' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });

        res.json({ message: 'Password has been successfully reset' });

    } catch (error) {
        return sendServerError(res, error, 'Reset password error');
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        const emailVerificationToken = hashToken(token);

        const user = await prisma.user.findFirst({
            where: {
                emailVerificationToken,
                emailVerificationExpires: { gt: new Date() },
            },
            select: {
                id: true,
                emailVerified: true,
            },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification link' });
        }

        if (user.emailVerified) {
            return res.json({ message: 'Email is already verified. You can sign in.' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerifiedAt: new Date(),
                emailVerificationToken: null,
                emailVerificationExpires: null,
            },
        });

        res.json({ message: 'Email verified successfully. You can now sign in.' });
    } catch (error) {
        return sendServerError(res, error, 'Verify email error');
    }
};

module.exports = { register, login, changePassword, forgotPassword, resetPassword, verifyEmail };
