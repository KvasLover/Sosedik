const pool = require('../database');

// Get all users
const getUsers = async () => {
  try {
    const result = await pool.query('SELECT id, phone, level, name, apartment, points, created_at FROM users');
    return result.rows;
  } catch (err) {
    throw err;
  }
};

// Get user by ID
const getUserById = async (id) => {
  try {
    const result = await pool.query('SELECT id, phone, level, name, apartment, show_apartment, verification_photo, points, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Get user by phone
const getUserByPhone = async (phone) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Create new user
const createUser = async (phone, passwordHash) => {
  try {
    const result = await pool.query(
      'INSERT INTO users (phone, password_hash, level) VALUES ($1, $2, $3) RETURNING id, phone, level, created_at',
      [phone, passwordHash, 1] // Level 1: registered user
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Update user level
const updateUserLevel = async (id, level) => {
  try {
    const result = await pool.query(
      'UPDATE users SET level = $1 WHERE id = $2 RETURNING id, level',
      [level, id]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Update user profile
const updateUserProfile = async (id, name, apartment, showApartment = false) => {
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, apartment = $2, show_apartment = $3 WHERE id = $4 RETURNING id, name, apartment, show_apartment',
      [name, apartment, showApartment, id]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Add points to user
const addPoints = async (id, points) => {
  try {
    const result = await pool.query(
      'UPDATE users SET points = points + $1 WHERE id = $2 RETURNING id, points',
      [points, id]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Delete user
const deleteUser = async (id) => {
  try {
    // First delete all user's ads
    await pool.query('DELETE FROM ads WHERE user_id = $1', [id]);

    // Then delete the user
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

const getPublicProfileData = async (userId, currentUserId = null) => {
  try {
    const userResult = await pool.query(
      'SELECT id, name, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) return null;
    const user = userResult.rows[0];

    const completedResult = await pool.query(
      `SELECT COUNT(DISTINCT ar.id) AS count
       FROM ad_requests ar
       JOIN ads ON ar.ad_id = ads.id
       WHERE (ar.requester_id = $1 OR ads.user_id = $1)
         AND ar.status = 'completed'`,
      [userId]
    );
    const completedCount = parseInt(completedResult.rows[0].count) || 0;

    const positiveResult = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM reviews
         WHERE reviewed_user_id = $1 AND result = 'success'
       ) AS has_positive`,
      [userId]
    );
    const hasPositive = positiveResult.rows[0].has_positive;

    const adsResult = await pool.query(
      `SELECT id, title, price, category
       FROM ads
       WHERE user_id = $1 AND active = true
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    let hasCommonDeals = false;
    if (currentUserId) {
      const commonRes = await pool.query(
        `SELECT EXISTS (
         SELECT 1 FROM ad_requests ar
         JOIN ads ON ar.ad_id = ads.id
         WHERE ar.status = 'completed'
           AND (
             (ar.requester_id = $1 AND ads.user_id = $2)
             OR
             (ar.requester_id = $2 AND ads.user_id = $1)
           )
       ) AS has_common`,
        [userId, currentUserId]
      );
      hasCommonDeals = commonRes.rows[0].has_common;
    }

    return {
      id: user.id,
      name: user.name || 'Соседик без имени',
      createdAt: user.created_at,
      completedCount,
      hasPositive,
      activeAds: adsResult.rows,
      hasCommonDeals
    };
  } catch (err) {
    throw err;
  }
};

module.exports = {
  getUsers,
  getUserById,
  getUserByPhone,
  createUser,
  updateUserLevel,
  updateUserProfile,
  addPoints,
  deleteUser,
  getPublicProfileData
};