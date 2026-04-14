const pool = require('../database');

// Add item to favorites
const addToFavorites = async (userId, itemType, itemId) => {
  try {
    const result = await pool.query(
      'INSERT INTO favorites (user_id, item_type, item_id) VALUES ($1, $2, $3) ON CONFLICT (user_id, item_type, item_id) DO NOTHING RETURNING *',
      [userId, itemType, itemId]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Remove from favorites
const removeFromFavorites = async (userId, itemType, itemId) => {
  try {
    const result = await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND item_type = $2 AND item_id = $3 RETURNING *',
      [userId, itemType, itemId]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Get user's favorites
const getUserFavorites = async (userId, itemType = null) => {
  try {
    let query = 'SELECT * FROM favorites WHERE user_id = $1';
    const values = [userId];

    if (itemType) {
      query += ' AND item_type = $2';
      values.push(itemType);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    throw err;
  }
};

// Check if item is in favorites
const isInFavorites = async (userId, itemType, itemId) => {
  try {
    const result = await pool.query(
      'SELECT id FROM favorites WHERE user_id = $1 AND item_type = $2 AND item_id = $3',
      [userId, itemType, itemId]
    );
    return result.rows.length > 0;
  } catch (err) {
    throw err;
  }
};

// Remove all favorites for user
const removeAllFavorites = async (userId) => {
  try {
    const result = await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 RETURNING *',
      [userId]
    );
    return result.rows;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  isInFavorites,
  removeAllFavorites
};