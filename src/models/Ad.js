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

// ===== НОВЫЕ МЕТОДЫ ДЛЯ СИСТЕМЫ ЗАПРОСОВ =====

// Создать запрос на принятие объявления
const createAdRequest = async (adId, requesterId, message = '') => {
  try {
    const result = await pool.query(`
      INSERT INTO ad_requests (ad_id, requester_id, message)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [adId, requesterId, message]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Получить входящие запросы (для автора объявления)
const getIncomingRequests = async (userId) => {
  try {
    const result = await pool.query(`
      SELECT ar.*, ads.title, ads.category, u.name as requester_name, u.phone as requester_phone
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      JOIN users u ON ar.requester_id = u.id
      WHERE ads.user_id = $1 AND ar.status = 'pending'
      ORDER BY ar.created_at DESC
    `, [userId]);
    return result.rows;
  } catch (err) {
    throw err;
  }
};

// Получить исходящие запросы (для запрашивающего)
const getOutgoingRequests = async (userId) => {
  try {
    const result = await pool.query(`
      SELECT ar.*, ads.title, ads.category, u.name as creator_name
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      JOIN users u ON ads.user_id = u.id
      WHERE ar.requester_id = $1
      ORDER BY ar.created_at DESC
    `, [userId]);
    return result.rows;
  } catch (err) {
    throw err;
  }
};

// Принять запрос на объявление
const acceptAdRequest = async (requestId, userId) => {
  try {
    // Проверяем, что пользователь - владелец объявления
    const request = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);

    if (request.rows.length === 0) {
      throw new Error('Request not found');
    }

    if (request.rows[0].ad_owner_id !== userId) {
      throw new Error('Not authorized to accept this request');
    }

    // Обновляем статус запроса
    const result = await pool.query(`
      UPDATE ad_requests
      SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [requestId]);

    // Обновляем статус объявления
    await pool.query(`
      UPDATE ads
      SET acceptance_status = 'accepted', accepted_by = $2, accepted_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [request.rows[0].ad_id, request.rows[0].requester_id]);

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Отклонить запрос на объявление
const declineAdRequest = async (requestId, userId, reason) => {
  try {
    // Проверяем, что пользователь - владелец объявления
    const request = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);

    if (request.rows.length === 0) {
      throw new Error('Request not found');
    }

    if (request.rows[0].ad_owner_id !== userId) {
      throw new Error('Not authorized to decline this request');
    }

    // Обновляем статус запроса
    const result = await pool.query(`
      UPDATE ad_requests
      SET status = 'declined', decline_reason = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [requestId, reason]);

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Подтвердить выполнение работы
const confirmAdCompletion = async (requestId, userId, isRequester) => {
  try {
    const request = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);

    if (request.rows.length === 0) {
      throw new Error('Request not found');
    }

    const req = request.rows[0];

    // Проверяем права доступа
    if (isRequester && req.requester_id !== userId) {
      throw new Error('Not authorized');
    }
    if (!isRequester && req.ad_owner_id !== userId) {
      throw new Error('Not authorized');
    }

    // Обновляем подтверждение
    const field = isRequester ? 'requester_confirmed' : 'creator_confirmed';
    await pool.query(`
      UPDATE ad_requests
      SET ${field} = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [requestId]);

    // Проверяем, подтвердили ли обе стороны
    const updated = await pool.query(`
      SELECT * FROM ad_requests WHERE id = $1
    `, [requestId]);

    const updatedReq = updated.rows[0];
    if (updatedReq.requester_confirmed && updatedReq.creator_confirmed) {
      // Обе стороны подтвердили - завершаем
      await pool.query(`
        UPDATE ad_requests
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [requestId]);

      await pool.query(`
        UPDATE ads
        SET acceptance_status = 'completed'
        WHERE id = $1
      `, [req.ad_id]);
    }

    return updated.rows[0];
  } catch (err) {
    throw err;
  }
};

// Получить активные запросы пользователя
const getActiveRequests = async (userId) => {
  try {
    const result = await pool.query(`
      SELECT ar.*, ads.title, ads.category,
             CASE
               WHEN ads.user_id = $1 THEN u2.name
               ELSE u1.name
             END as other_party_name
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      JOIN users u1 ON ar.requester_id = u1.id
      JOIN users u2 ON ads.user_id = u2.id
      WHERE (ar.requester_id = $1 OR ads.user_id = $1)
        AND ar.status IN ('accepted', 'pending')
      ORDER BY ar.updated_at DESC
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
  getUserAds,
  // Новые методы для системы запросов
  createAdRequest,
  getIncomingRequests,
  getOutgoingRequests,
  acceptAdRequest,
  declineAdRequest,
  confirmAdCompletion,
  getActiveRequests
};