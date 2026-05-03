const express = require('express');
const router = express.Router();
const pool = require('../database');

// Публичная статистика для гостей
router.get('/public', async (req, res) => {
  try {
    const usersCount = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    const completedDeals = await pool.query(
      "SELECT COUNT(*)::int AS count FROM ad_requests WHERE status = 'completed'"
    );
    const activeAds = await pool.query(
      "SELECT COUNT(*)::int AS count FROM ads WHERE active = true"
    );
    const activeRentals = await pool.query(
      "SELECT COUNT(*)::int AS count FROM ads WHERE active = true AND type = 'rental'"
    );
    const topCategories = await pool.query(
      `SELECT category, COUNT(*)::int AS count
       FROM ads
       WHERE active = true
       GROUP BY category
       ORDER BY count DESC
       LIMIT 5`
    );

    res.json({
      usersCount: usersCount.rows[0].count,
      completedDeals: completedDeals.rows[0].count,
      activeAds: activeAds.rows[0].count,
      activeRentals: activeRentals.rows[0].count,
      topCategories: topCategories.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;