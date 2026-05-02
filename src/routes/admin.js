const express = require('express');
const router = express.Router();
const { verifyToken, checkLevel } = require('../middleware/auth');
const Admin = require('../models/Admin');

// Все маршруты доступны только администратору (уровень 4)
router.use(verifyToken);
router.use(checkLevel(4));

// Получить список пользователей
router.get('/users', async (req, res) => {
  try {
    const users = await Admin.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Изменить уровень пользователя
router.put('/users/:id/level', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { level } = req.body;
    if (![1,2,3,4].includes(level)) {
      return res.status(400).json({ message: 'Недопустимый уровень. Допустимы: 1,2,3,4' });
    }
    const updated = await Admin.setUserLevel(userId, level);
    res.json({ message: 'Уровень обновлён', user: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Статистика
router.get('/stats', async (req, res) => {
  try {
    const stats = await Admin.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить все объявления
router.get('/ads', async (req, res) => {
  try {
    const ads = await Admin.getAllAds();
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Удалить объявление
router.delete('/ads/:id', async (req, res) => {
  try {
    await Admin.adminDeleteAd(req.params.id);
    res.json({ message: 'Объявление удалено' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;