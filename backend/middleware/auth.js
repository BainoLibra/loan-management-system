const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
};

// Verify token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  try {
    const user = jwt.verify(token, getJwtSecret());
    req.user = user; // attach user to request
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
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

module.exports = { authenticateToken, authorizeRole };
