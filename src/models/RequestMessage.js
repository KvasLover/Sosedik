const pool = require('../database');

// Получить все сообщения по request_id (с именами отправителей)
const getMessagesByRequestId = async (requestId) => {
  const result = await pool.query(`
    SELECT rm.id, rm.request_id, rm.sender_id, rm.text, rm.created_at,
           u.name as sender_name
    FROM request_messages rm
    JOIN users u ON rm.sender_id = u.id
    WHERE rm.request_id = $1
    ORDER BY rm.created_at ASC
  `, [requestId]);
  return result.rows;
};

// Создать сообщение
const createMessage = async (requestId, senderId, text) => {
  const result = await pool.query(`
    INSERT INTO request_messages (request_id, sender_id, text)
    VALUES ($1, $2, $3)
    RETURNING id, request_id, sender_id, text, created_at
  `, [requestId, senderId, text]);
  return result.rows[0];
};

module.exports = { getMessagesByRequestId, createMessage };