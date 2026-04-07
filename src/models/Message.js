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

// Get list of conversations for a user
const getConversations = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT 
         CASE WHEN cm.sender_id = $1 THEN cm.receiver_id ELSE cm.sender_id END as partner_id,
         u.name as partner_name,
         u.verification_photo as partner_photo,
         cm.content as last_message,
         cm.created_at as last_time
       FROM chat_messages cm
       JOIN users u ON u.id = CASE WHEN cm.sender_id = $1 THEN cm.receiver_id ELSE cm.sender_id END
       WHERE cm.sender_id = $1 OR cm.receiver_id = $1
       ORDER BY cm.created_at DESC`,
      [userId]
    );
    
    // Group by partner_id to get unique conversations with latest message
    const conversations = {};
    result.rows.forEach(row => {
      if (!conversations[row.partner_id]) {
        conversations[row.partner_id] = {
          partnerId: row.partner_id,
          partnerName: row.partner_name || 'Соседик без имени',
          partnerPhoto: row.partner_photo,
          lastMessage: row.last_message,
          lastTime: row.last_time
        };
      }
    });
    
    return Object.values(conversations);
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
  createMessage,
  getConversations
};