const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Ad = require('../models/Ad');

// Проверить, может ли пользователь поднять конкретное объявление
router.get('/ads/:id/can-boost', verifyToken, async (req, res) => {
  try {
    const check = await Ad.canBoostAd(req.params.id, req.user.id);
    res.json(check);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Поднять объявление (списать 5 баллов и установить boosted_until)
router.post('/ads/:id/boost', verifyToken, async (req, res) => {
  try {
    const result = await Ad.boostAd(req.params.id, req.user.id);
    res.json({ message: 'Объявление поднято на 24 часа', boosted_until: result.boosted_until });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;