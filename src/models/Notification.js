const pool = require('../database');

// Get notifications for user
const getUserNotifications = async (userId, limit = 50, offset = 0) => {
  try {
    const result = await pool.query(
      'SELECT id, type, title, message, is_read, related_id, related_type, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return result.rows;
  } catch (err) {
    throw err;
  }
};

// Get unread notifications count
const getUnreadCount = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
    return parseInt(result.rows[0].count);
  } catch (err) {
    throw err;
  }
};

// Create notification
const createNotification = async (userId, type, message, title = null, relatedId = null, relatedType = null) => {
  const result = await pool.query(
    'INSERT INTO notifications (user_id, type, message, title, related_id, related_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [userId, type, message, title, relatedId, relatedType]
  );
  return result.rows[0];
};

// Mark notification as read
const markAsRead = async (notificationId, userId) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Mark all notifications as read for user
const markAllAsRead = async (userId) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE RETURNING *',
      [userId]
    );
    return result.rows;
  } catch (err) {
    throw err;
  }
};

// Delete notification
const deleteNotification = async (notificationId, userId) => {
  try {
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Удалить все уведомления пользователя
const deleteAllForUser = async (userId) => {
  const result = await pool.query('DELETE FROM notifications WHERE user_id = $1 RETURNING id', [userId]);
  return result.rowCount;
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllForUser
};