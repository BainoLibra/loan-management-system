const jwt = require('jsonwebtoken');
const { prisma } = require('../db');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
};

// Verify token and enforce active user status in database
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    if (dbUser.status !== 'active') {
      return res.status(403).json({ error: 'Account has been deactivated. Please contact an administrator.' });
    }

    req.user = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
    };
    next();
  } catch (err) {
    console.error('User validation error in authenticateToken:', err);
    return res.status(500).json({ error: 'Failed to authenticate user state' });
  }
}

// Role-based access
function authorizeRole(...roles) {
  return (req, res, next) => {
    if (!req.user){
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

// Optional token verification (attaches user if valid token present, proceed anyway if absent)
async function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, getJwtSecret());
        const dbUser = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        });
        if (dbUser && dbUser.status === 'active') {
          req.user = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
            status: dbUser.status,
          };
        }
      } catch (err) {
        // Ignore token errors for optional authentication
      }
    }
  }
  next();
}

module.exports = { authenticateToken, authorizeRole, optionalAuthenticateToken };


