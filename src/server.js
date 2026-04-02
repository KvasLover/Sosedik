const express = require('express');
const pool = require('./database');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adsRoutes = require('./routes/ads');
const usersRoutes = require('./routes/users');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/users', usersRoutes);

// Test database connection
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', database: 'connected', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.send('Welcome to Sosedik App');
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Database connected to ${process.env.DATABASE_URL}`);
});