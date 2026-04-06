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
    const result = await pool.query('SELECT id, phone, level, name, apartment, show_apartment, points, created_at FROM users WHERE id = $1', [id]);
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

module.exports = {
  getUsers,
  getUserById,
  getUserByPhone,
  createUser,
  updateUserLevel,
  updateUserProfile,
  addPoints,
  deleteUser
};