const jwt = require('jsonwebtoken');

const SECRET = 'mysecretkey';

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
    const user = jwt.verify(token, SECRET);
    req.user = user; // attach user to request
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Role-based access
function authorizeRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRole };
