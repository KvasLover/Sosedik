const pool = require('../database');

// Get all active ads
const getAds = async (filters = {}) => {
  let query = `SELECT ads.id, ads.user_id, ads.category, ads.title, ads.description, ads.price, ads.contact, ads.created_at, ads.active, ads.accepted_by, users.name as acceptor_name
               FROM ads
               LEFT JOIN users ON ads.accepted_by = users.id
               WHERE ads.active = true`;
  const values = [];

  if (filters.category) {
    query += ' AND ads.category = $' + (values.length + 1);
    values.push(filters.category);
  }

  if (filters.type) {
    query += ' AND ads.type = $' + (values.length + 1);
    values.push(filters.type);
  }

  query += ' ORDER BY ads.created_at DESC';

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
    const result = await pool.query(`
      SELECT ads.*, users.name as acceptor_name
      FROM ads
      LEFT JOIN users ON ads.accepted_by = users.id
      WHERE ads.id = $1
    `, [id]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Create new ad
const createAd = async (userId, category, title, description, price = null, contact = null) => {
  try {
    const result = await pool.query(
      'INSERT INTO ads (user_id, category, title, description, price, contact) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, category, title, description, price, contact]
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

// Delete ad
const deleteAd = async (id) => {
  try {
    const result = await pool.query('DELETE FROM ads WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Accept ad
const acceptAd = async (id, userId) => {
  try {
    const result = await pool.query(
      'UPDATE ads SET accepted_by = $1, accepted_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id != $1 AND accepted_by IS NULL RETURNING *',
      [userId, id]
    );
    if (result.rows.length === 0) {
      throw new Error('Ad not found or already accepted');
    }
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Cancel acceptance of ad
const cancelAd = async (id) => {
  try {
    const result = await pool.query(
      'UPDATE ads SET accepted_by = NULL, accepted_at = NULL WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      throw new Error('Ad not found');
    }
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Get accepted ads for user
const getAcceptedAds = async (userId) => {
  try {
    const result = await pool.query(`
      SELECT ads.*, users.name as owner_name
      FROM ads
      LEFT JOIN users ON ads.user_id = users.id
      WHERE ads.accepted_by = $1
      ORDER BY ads.accepted_at DESC
    `, [userId]);
    return result.rows;
  } catch (err) {
    throw err;
  }
};

// Get user's own ads
const getUserAds = async (userId) => {
  try {
    const result = await pool.query(`
      SELECT ads.*, users.name as acceptor_name
      FROM ads
      LEFT JOIN users ON ads.accepted_by = users.id
      WHERE ads.user_id = $1
      ORDER BY ads.created_at DESC
    `, [userId]);
    return result.rows;
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
  deleteAd,
  acceptAd,
  cancelAd,
  getAcceptedAds,
  getUserAds
};