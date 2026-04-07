const pool = require('../database');

// Get all rentals
const getRentals = async (filters = {}) => {
  let query = 'SELECT id, owner_id, item_name, category, photos, rental_terms, value_category, created_at FROM rentals';
  const values = [];

  if (filters.category) {
    query += ' WHERE category = $' + (values.length + 1);
    values.push(filters.category);
  }

  query += ' ORDER BY created_at DESC';

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    throw err;
  }
};

// Get rental by ID
const getRentalById = async (id) => {
  try {
    const result = await pool.query('SELECT * FROM rentals WHERE id = $1', [id]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Create new rental
const createRental = async (ownerId, itemName, category, photos = [], rentalTerms, valueCategory) => {
  try {
    const result = await pool.query(
      'INSERT INTO rentals (owner_id, item_name, category, photos, rental_terms, value_category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [ownerId, itemName, category, photos, rentalTerms, valueCategory]
    );
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Get rentals by owner
const getRentalsByOwner = async (ownerId) => {
  try {
    const result = await pool.query('SELECT * FROM rentals WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
    return result.rows;
  } catch (err) {
    throw err;
  }
};

// Delete rental
const deleteRental = async (id, ownerId) => {
  try {
    const result = await pool.query('DELETE FROM rentals WHERE id = $1 AND owner_id = $2 RETURNING *', [id, ownerId]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

module.exports = {
  getRentals,
  getRentalById,
  createRental,
  getRentalsByOwner,
  deleteRental
};