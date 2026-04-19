const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { verifyToken } = require('../middleware/auth');

// Get user notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const notifications = await Notification.getUserNotifications(userId, limit, offset);
    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      notifications,
      unreadCount,
      pagination: {
        limit,
        offset,
        hasMore: notifications.length === limit
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get unread count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.getUnreadCount(userId);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const notification = await Notification.markAsRead(notificationId, userId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark all notifications as read
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.markAllAsRead(userId);
    res.json({ message: 'All notifications marked as read', count: notifications.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete notification
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const notification = await Notification.deleteNotification(notificationId, userId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;