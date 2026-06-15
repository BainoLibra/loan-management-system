require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { prisma, init, disconnect } = require('./db');

// Routes
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const groupRoutes = require('./routes/groupRoutes');
const loanRoutes = require('./routes/loanRoutes');
const repaymentRoutes = require('./routes/repaymentRoutes');
const auditRoutes = require('./routes/auditRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Security: Disable X-Powered-By header
app.disable('x-powered-by');
app.set('trust proxy', 1);

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

if (process.env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
  console.warn('WARNING: FRONTEND_URL is not set in production. CORS will allow same-origin requests only.');
}

const isLocalDevOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const getSameOrigin = (req) => {
  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host');
  return host ? `${protocol}://${host}`.replace(/\/$/, '') : null;
};

const createCorsOptions = (req) => ({
  origin: (requestOrigin, callback) => {
    if (!requestOrigin) return callback(null, true);

    const normalizedOrigin = requestOrigin.replace(/\/$/, '');
    const allowed =
      configuredOrigins.includes(normalizedOrigin) ||
      normalizedOrigin === getSameOrigin(req) ||
      (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(normalizedOrigin));

    if (allowed) return callback(null, true);

    const error = new Error('Not allowed by CORS');
    error.status = 403;
    return callback(error, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
});

app.use((req, res, next) => cors(createCorsOptions(req))(req, res, next));
app.options('*', (req, res, next) => cors(createCorsOptions(req))(req, res, next)); // Handle preflight requests
app.use(bodyParser.json());

const ready = init();
ready.catch(() => {});

app.use(async (_req, _res, next) => {
  try {
    await ready;
    next();
  } catch (error) {
    console.error('Database initialization failed:', error);
    const err = new Error('Database connection failed');
    err.status = 503; // Service Unavailable
    next(err);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/loans', repaymentRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is healthy' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is healthy' });
});

app.get('/test-db', async (_req, res) => {
  try {
    const rows = await prisma.$queryRaw`SELECT 1 AS ok`;
    res.json({ message: 'DB connected', rows });
  } catch (error) {
    console.error('Test DB error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/test-db', async (_req, res) => {
  try {
    const rows = await prisma.$queryRaw`SELECT 1 AS ok`;
    res.json({ message: 'DB connected', rows });
  } catch (error) {
    console.error('Test DB API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler - must come before error handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler - must be last middleware
app.use((err, _req, res, _next) => {
  console.error('Server Error:', err);
  const message = err.status && err.status < 500
    ? (err.message || 'Request failed')
    : err.status === 503
    ? (err.message || 'Service unavailable')
    : (process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : (err.message || 'Internal Server Error'));
  res.status(err.status || 500).json({
    error: message,
  });
});

module.exports = { app, prisma, ready, disconnect };
