require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { prisma, init } = require('./db');

// Routes
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const loanRoutes = require('./routes/loanRoutes');
const repaymentRoutes = require('./routes/repaymentRoutes');
const auditRoutes = require('./routes/auditRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(cors());
app.use(bodyParser.json());

const ready = init();

app.use(async (_req, _res, next) => {
  try {
    await ready;
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/loans', repaymentRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.get('/', (_req, res) => {
  res.send('Server working');
});

app.get('/test-db', async (_req, res) => {
  try {
    const rows = await prisma.$queryRaw`SELECT 1 AS ok`;
    res.json({ message: 'DB connected', rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { app };