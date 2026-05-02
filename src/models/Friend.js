const pool = require('../database');

// Создать запрос дружбы (если ещё нет активного)
const createFriendRequest = async (fromUserId, toUserId) => {
  // Проверяем, нет ли уже активного запроса или дружбы
  const existingRequest = await pool.query(
    'SELECT id FROM friend_requests WHERE from_user_id = $1 AND to_user_id = $2 AND status = $3',
    [fromUserId, toUserId, 'pending']
  );
  if (existingRequest.rows.length > 0) {
    return null; // уже отправлен
  }

  const result = await pool.query(
    'INSERT INTO friend_requests (from_user_id, to_user_id) VALUES ($1, $2) RETURNING *',
    [fromUserId, toUserId]
  );
  return result.rows[0];
};

// Принять запрос
const acceptFriendRequest = async (requestId, userId) => {
  // userId должен совпадать с to_user_id
  const request = await pool.query('SELECT * FROM friend_requests WHERE id = $1 AND to_user_id = $2 AND status = $3',
    [requestId, userId, 'pending']);
  if (request.rows.length === 0) throw new Error('Request not found or already processed');

  await pool.query('UPDATE friend_requests SET status = $1, updated_at = NOW() WHERE id = $2', ['accepted', requestId]);

  // Добавляем в друзья (взаимно? В исходной логике дружба односторонняя: userId добавил friendId.
  // При принятии мы можем добавить в обе стороны, чтобы оба видели друг друга.
  // Добавим в обе стороны:
  const fromId = request.rows[0].from_user_id;
  const toId = request.rows[0].to_user_id;
  await pool.query('INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [fromId, toId]);
  await pool.query('INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [toId, fromId]);

  return { fromId, toId };
};

// Отклонить запрос
const declineFriendRequest = async (requestId, userId) => {
  const result = await pool.query(
    'UPDATE friend_requests SET status = $1, updated_at = NOW() WHERE id = $2 AND to_user_id = $3 AND status = $4 RETURNING *',
    ['rejected', requestId, userId, 'pending']
  );
  if (result.rows.length === 0) throw new Error('Request not found or already processed');
  return result.rows[0];
};

// Проверить статус дружбы
const checkFriendship = async (userId, friendId) => {
  const result = await pool.query(
    'SELECT id FROM friends WHERE user_id = $1 AND friend_id = $2',
    [userId, friendId]
  );
  return result.rows.length > 0;
};

// Проверить, отправлял ли я запрос этому пользователю
const getRequestStatus = async (fromUserId, toUserId) => {
  const result = await pool.query(
    'SELECT status FROM friend_requests WHERE from_user_id = $1 AND to_user_id = $2 ORDER BY created_at DESC LIMIT 1',
    [fromUserId, toUserId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].status; // 'pending', 'accepted', 'rejected'
};

// Получить входящие запросы (для пользователя)
const getIncomingRequests = async (userId) => {
  const result = await pool.query(
    `SELECT fr.id, fr.from_user_id, u.name as from_name, u.phone, fr.created_at
     FROM friend_requests fr
     JOIN users u ON fr.from_user_id = u.id
     WHERE fr.to_user_id = $1 AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [userId]
  );
  return result.rows;
};

// Получить список друзей
const getFriends = async (userId) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.phone, u.verification_photo
     FROM friends f
     JOIN users u ON f.friend_id = u.id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return result.rows;
};

// Удалить друга
const removeFriend = async (userId, friendId) => {
  // Удаляем в обе стороны, чтобы разорвать дружбу полностью
  await pool.query('DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)', [userId, friendId]);
  return { success: true };
};

module.exports = {
  createFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  checkFriendship,
  getRequestStatus,
  getIncomingRequests,
  getFriends,
  removeFriend
};