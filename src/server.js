const express = require('express');
const pool = require('./database');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adsRoutes = require('./routes/ads');
const usersRoutes = require('./routes/users');
const messagesRoutes = require('./routes/messages');
const rentalsRoutes = require('./routes/rentals');
const favoritesRoutes = require('./routes/favorites');
const notificationsRoutes = require('./routes/notifications');
const requestMessagesRoutes = require('./routes/request-messages');
const { autoCancelExpiredAcceptedRequests } = require('./models/Ad');
const reputationRoutes = require('./routes/reputation');
const adminRoutes = require('./routes/admin');
const friendsRoutes = require('./routes/friends');
const statsRoutes = require('./routes/stats');
const verificationRoutes = require('./routes/verification');
const electionsRoutes = require('./routes/elections');
const pointsRoutes = require('./routes/points');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/rentals', rentalsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/request-messages', requestMessagesRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api', reputationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/elections', electionsRoutes);
app.use('/api/points', pointsRoutes);

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

// ЗАПУСК АВТООТМЕНЫ (каждые 60 секунд)
setInterval(() => {
  autoCancelExpiredAcceptedRequests().catch(err => console.error('Ошибка в автоотмене:', err));
}, 60000);

const Election = require('./models/Election');
setInterval(() => {
  Election.processExpiredElections().catch(err => console.error('Ошибка обработки голосований:', err));
}, 60000); // каждую минуту