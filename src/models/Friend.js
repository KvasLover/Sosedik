const pool = require('../database');

const addFriend = async (userId, friendId) => {
  const result = await pool.query(
    'INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
    [userId, friendId]
  );
  return result.rows[0];
};

const removeFriend = async (userId, friendId) => {
  const result = await pool.query(
    'DELETE FROM friends WHERE user_id = $1 AND friend_id = $2 RETURNING *',
    [userId, friendId]
  );
  return result.rows[0];
};

const checkFriendship = async (userId, friendId) => {
  const result = await pool.query(
    'SELECT id FROM friends WHERE user_id = $1 AND friend_id = $2',
    [userId, friendId]
  );
  return result.rows.length > 0;
};

module.exports = { addFriend, removeFriend, checkFriendship };