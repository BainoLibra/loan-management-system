const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'mysecretkey';
const { authenticateToken, authorizeRole } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const loanRoutes = require('./routes/loanRoutes');
const repaymentRoutes = require('./routes/repaymentRoutes');
const auditRoutes = require('./routes/auditRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://libra1.healthlinks.ug',
  credentials: true,
}));
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/loans', repaymentRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.send('Server working');
});

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1');
    res.json({ message: 'DB connected', rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, '0.0.0.0', () => console.log(`Backend listening on port ${port}`));
