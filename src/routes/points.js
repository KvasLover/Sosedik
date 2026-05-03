const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Points = require('../models/Points');

// Получить баланс и историю баллов текущего пользователя
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const balance = await Points.getBalance(userId);
    const history = await Points.getHistory(userId);
    res.json({ balance, history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;