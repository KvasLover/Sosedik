const pool = require('../database');

// Get all active ads
const getAds = async (filters = {}) => {
  let query = 'SELECT id, user_id, type, category, title, description, urgency, location, created_at, active FROM ads WHERE active = true';
  const values = [];

  if (filters.category) {
    query += ' AND category = $' + (values.length + 1);
    values.push(filters.category);
  }

  if (filters.type) {
    query += ' AND type = $' + (values.length + 1);
    values.push(filters.type);
  }

  query += ' ORDER BY created_at DESC';

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    throw err;
  }
};

// Get ad by ID
const getAdById = async (id) => {
  try {
    const result = await pool.query('SELECT * FROM ads WHERE id = $1', [id]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Create new ad
const createAd = async (userId, type, category, title, description, urgency = false, location = null) => {
  try {
    const result = await pool.query(
      'INSERT INTO ads (user_id, type, category, title, description, urgency, location) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [userId, type, category, title, description, urgency, location]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Update ad
const updateAd = async (id, title, description, category, location) => {
  try {
    const result = await pool.query(
      'UPDATE ads SET title = $1, description = $2, category = $3, location = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [title, description, category, location, id]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Archive old ads
const archiveOldAds = async (daysOld = 60) => {
  try {
    const result = await pool.query(
      'UPDATE ads SET active = false WHERE active = true AND created_at < NOW() - INTERVAL \'$1 days\'',
      [daysOld]
    );
    return result.rowCount;
  } catch (err) {
    throw err;
  }
};

// Delete ad (archive)
const deleteAd = async (id) => {
  try {
    const result = await pool.query('UPDATE ads SET active = false WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

module.exports = {
  getAds,
  getAdById,
  createAd,
  updateAd,
  archiveOldAds,
  deleteAd
};