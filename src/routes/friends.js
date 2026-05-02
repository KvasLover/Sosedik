const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Friend = require('../models/Friend');
const Notification = require('../models/Notification');
const pool = require('../database');

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

// Отправить запрос дружбы (раньше было мгновенное добавление)
router.post('/add/:friendId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId, 10);
    if (!friendId) return res.status(400).json({ message: 'friendId required' });
    if (userId === friendId) return res.status(400).json({ message: 'Cannot add yourself' });

    // Проверяем, не друзья ли уже
    const alreadyFriends = await Friend.checkFriendship(userId, friendId);
    if (alreadyFriends) return res.status(400).json({ message: 'Already friends' });

    const request = await Friend.createFriendRequest(userId, friendId);
    if (!request) {
      return res.status(400).json({ message: 'Request already sent or pending' });
    }

    // Уведомление получателю
    const sender = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const senderName = sender.rows[0]?.name || 'Пользователь';
    await Notification.createNotification(
      friendId,
      'friend_request',
      `${senderName} хочет добавить вас в друзья`,
      null,
      request.id,
      'friend_request'
    );

    res.json({ message: 'Friend request sent', request });
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

// Получить входящие запросы
router.get('/requests', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await Friend.getIncomingRequests(userId);
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Принять запрос
router.post('/accept/:requestId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = parseInt(req.params.requestId, 10);
    if (!requestId) return res.status(400).json({ message: 'requestId required' });

    const { fromId, toId } = await Friend.acceptFriendRequest(requestId, userId);

    // Уведомление отправителю
    await Notification.createNotification(
      fromId,
      'friend_request_accepted',
      'Ваш запрос на добавление в друзья принят',
      null,
      null, // related_id не указываем, либо можно null
      'friend_request'
    );

    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Отклонить запрос
router.post('/decline/:requestId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = parseInt(req.params.requestId, 10);
    if (!requestId) return res.status(400).json({ message: 'requestId required' });

    await Friend.declineFriendRequest(requestId, userId);
    res.json({ message: 'Friend request declined' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить список друзей
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const friends = await Friend.getFriends(userId);
    res.json({ friends });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Проверить статус моего запроса этому пользователю
router.get('/check-request-status/:friendId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId, 10);
    if (!friendId) return res.status(400).json({ message: 'friendId required' });
    const status = await Friend.getRequestStatus(userId, friendId);
    res.json({ status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;