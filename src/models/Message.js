const pool = require('../database');

// Get messages between two users
const getConversation = async (userId, partnerId) => {
  try {
    const result = await pool.query(
      `SELECT id, sender_id, receiver_id, content, created_at
       FROM chat_messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [userId, partnerId]
    );
    return result.rows;
  } catch (err) {
    throw err;
  }
};

// Create new message
const createMessage = async (senderId, receiverId, content) => {
  try {
    const result = await pool.query(
      'INSERT INTO chat_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING id, sender_id, receiver_id, content, created_at',
      [senderId, receiverId, content]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

module.exports = {
  getConversation,
  createMessage
};