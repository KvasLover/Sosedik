const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Friend = require('../models/Friend');

// Проверить, друзья ли мы
router.get('/check/:friendId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId, 10);
    if (!friendId) return res.status(400).json({ message: 'friendId required' });

    const isFriend = await Friend.checkFriendship(userId, friendId);
    res.json({ isFriend });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Добавить в друзья
router.post('/add/:friendId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId, 10);
    if (!friendId) return res.status(400).json({ message: 'friendId required' });

    await Friend.addFriend(userId, friendId);
    // Взаимность не обязательна, но если нужна – можно добавить ещё запись в другую сторону.
    // Для простоты делаем одностороннюю дружбу: userId добавил friendId.
    res.json({ message: 'Friend added' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Удалить из друзей
router.delete('/remove/:friendId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId, 10);
    if (!friendId) return res.status(400).json({ message: 'friendId required' });

    await Friend.removeFriend(userId, friendId);
    res.json({ message: 'Friend removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/friends — список друзей текущего пользователя
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const friends = await Friend.getFriends(userId);
    res.json({ friends });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;