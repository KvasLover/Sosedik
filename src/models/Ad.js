const pool = require('../database');
const Notification = require('./Notification');

// Get all active ads
const getAds = async (filters = {}) => {
  let query = `SELECT ads.id, ads.user_id, ads.category, ads.title, ads.description, ads.price, ads.contact, ads.created_at, ads.active, ads.accepted_by, users.name as acceptor_name, author.name as author_name, ads.preferred_time, ads.terms
               FROM ads
               LEFT JOIN users ON ads.accepted_by = users.id
               LEFT JOIN users as author ON ads.user_id = author.id
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
      SELECT ads.*, users.name as acceptor_name, author.name as author_name, author.phone as author_phone
      FROM ads
      LEFT JOIN users ON ads.accepted_by = users.id
      LEFT JOIN users as author ON ads.user_id = author.id
      WHERE ads.id = $1
    `, [id]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Create new ad
const createAd = async (userId, category, title, description, price = null, contact = null, preferredTime = null, terms = null) => {
  try {
    const result = await pool.query(
      `INSERT INTO ads (user_id, category, title, description, price, contact, preferred_time, terms) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, category, title, description, price, contact, preferredTime, terms]
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
    // First, delete any completed requests from this user for this ad
    await pool.query(`
      DELETE FROM ad_requests
      WHERE ad_id = $1 AND requester_id = $2 AND status = 'completed'
    `, [adId, requesterId]);

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
  const result = await pool.query(`
    SELECT ar.*, ads.title, ads.category, u.name as requester_name, u.phone as requester_phone
    FROM ad_requests ar
    JOIN ads ON ar.ad_id = ads.id
    JOIN users u ON ar.requester_id = u.id
    WHERE ads.user_id = $1 
      AND ar.status IN ('pending', 'rejected')
      AND (ar.hidden_by_creator IS NOT TRUE)
    ORDER BY ar.created_at DESC
  `, [userId]);
  return result.rows;
};

// Получить исходящие запросы (для запрашивающего)
const getOutgoingRequests = async (userId) => {
  const result = await pool.query(`
    SELECT ar.*, ads.title, ads.category, ads.user_id, 
           u.name as requester_name, u.phone as requester_phone,
           u2.name as creator_name, u2.phone as creator_phone
    FROM ad_requests ar
    JOIN ads ON ar.ad_id = ads.id
    JOIN users u ON ar.requester_id = u.id
    JOIN users u2 ON ads.user_id = u2.id
    WHERE ar.requester_id = $1 
      AND ar.status IN ('pending', 'rejected')
      AND (ar.hidden_by_requester IS NOT TRUE)
    ORDER BY ar.created_at DESC
  `, [userId]);
  return result.rows;
};

// Принять запрос на объявление (переводит из pending в accepted)
// Все остальные pending запросы для этого же объявления автоматически отклоняются
const acceptAdRequest = async (requestId, userId) => {
  try {
    // Проверяем, что пользователь - владелец объявления
    const request = await pool.query(`
  SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status, ads.title
  FROM ad_requests ar
  JOIN ads ON ar.ad_id = ads.id
  WHERE ar.id = $1
`, [requestId]);

    if (request.rows.length === 0) {
      throw new Error('Request not found');
    }

    const req = request.rows[0];

    if (req.ad_owner_id !== userId) {
      throw new Error('Not authorized to accept this request');
    }

    // Проверяем, что запрос в статусе pending
    if (req.current_status !== 'pending') {
      throw new Error('Can only accept pending requests');
    }

    // АВТОМАТИЧЕСКИ ОТКЛОНЯЕМ ВСЕ ОСТАЛЬНЫЕ PENDING ЗАПРОСЫ НА ЭТО ОБЪЯВЛЕНИЕ
    await pool.query(`
      UPDATE ad_requests
      SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
      WHERE ad_id = $1 AND status = 'pending' AND id != $2
    `, [req.ad_id, requestId]);

    // Обновляем статус принятого запроса
    const result = await pool.query(`
  UPDATE ad_requests
  SET status = 'accepted', updated_at = CURRENT_TIMESTAMP, accepted_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING *
`, [requestId]);

    // Обновляем статус объявления
    await pool.query(`
      UPDATE ads
      SET acceptance_status = 'accepted', accepted_by = $2, accepted_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [req.ad_id, req.requester_id]);

    // Уведомление запросившему
    await Notification.createNotification(
      req.requester_id,
      'request_accepted',
      `Ваш запрос на объявление "${req.title}" принят`,
      'Запрос принят'
    );

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Начать выполнение работы (переводит accepted → in_progress)
// Может быть вызвано только если запрос в статусе accepted
// Доступно для обеих сторон

const startAdRequest = async (requestId, userId, agreedPrice = null, agreedTime = null, agreementComment = null) => {
  try {
    // Получаем запрос и связанное объявление
    const request = await pool.query(`
  SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status,
         ads.price as ad_price, ads.preferred_time as ad_time, ads.terms as ad_terms,
         ads.title
  FROM ad_requests ar
  JOIN ads ON ar.ad_id = ads.id
  WHERE ar.id = $1
`, [requestId]);

    if (request.rows.length === 0) throw new Error('Request not found');
    const req = request.rows[0];

    // Проверка прав и статуса
    if (req.current_status !== 'accepted') throw new Error('Can only start accepted requests');
    if (req.ad_owner_id !== userId && req.requester_id !== userId) throw new Error('Not authorized to start this request');

    // Определяем значения для agreed_* (только если они ещё не установлены)
    // Для цены: если передан agreedPrice, используем его, иначе из объявления, иначе NULL
    let newAgreedPrice = (agreedPrice !== null && agreedPrice !== undefined) ? agreedPrice : req.ad_price;
    let newAgreedTime = (agreedTime !== null && agreedTime !== undefined) ? agreedTime : req.ad_time;
    let newAgreedComment = (agreementComment !== null && agreementComment !== undefined) ? agreementComment : req.ad_terms;

    // Защита от перезаписи: используем COALESCE, чтобы не менять уже установленные значения
    const result = await pool.query(`
      UPDATE ad_requests
      SET status = 'in_progress',
          updated_at = CURRENT_TIMESTAMP,
          agreed_price = COALESCE(agreed_price, $2),
          agreed_time = COALESCE(agreed_time, $3),
          agreement_comment = COALESCE(agreement_comment, $4)
      WHERE id = $1 AND status = 'accepted'
      RETURNING *
    `, [requestId, newAgreedPrice, newAgreedTime, newAgreedComment]);

    // Если ни одна строка не обновлена, значит статус уже не accepted (гонка)
    if (result.rows.length === 0) {
      throw new Error('Request already started or invalid state');
    }

    // Обновляем статус объявления
    await pool.query(`
      UPDATE ads
      SET acceptance_status = 'in_progress'
      WHERE id = $1
    `, [req.ad_id]);

    const otherUserId = (userId === req.requester_id) ? req.ad_owner_id : req.requester_id;
    await Notification.createNotification(
      otherUserId,
      'request_started',
      `Сделка по объявлению "${req.title}" начата`,
      'Сделка начата'
    );

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Отклонить запрос на объявление (статус: pending → rejected)
const declineAdRequest = async (requestId, userId, reason) => {
  try {
    // Проверяем, что пользователь - владелец объявления
    const request = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);

    if (request.rows.length === 0) {
      throw new Error('Request not found');
    }

    const req = request.rows[0];

    if (req.ad_owner_id !== userId) {
      throw new Error('Not authorized to decline this request');
    }

    // Проверяем, что запрос в статусе pending
    if (req.current_status !== 'pending') {
      throw new Error('Can only decline pending requests');
    }

    // Обновляем статус запроса
    const result = await pool.query(`
      UPDATE ad_requests
      SET status = 'rejected', decline_reason = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [requestId, reason]);

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

const confirmAdCompletion = async (requestId, userId) => {
  try {
    const request = await pool.query(`
  SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status, ads.title
  FROM ad_requests ar
  JOIN ads ON ar.ad_id = ads.id
  WHERE ar.id = $1
`, [requestId]);

    if (request.rows.length === 0) throw new Error('Request not found');
    const req = request.rows[0];

    // Автоматически определяем, кто подтверждает
    let isRequester = false;
    if (req.requester_id === userId) isRequester = true;
    else if (req.ad_owner_id === userId) isRequester = false;
    else throw new Error('Not authorized');

    // Проверка статуса
    if (req.current_status !== 'in_progress') {
      throw new Error('Can only confirm completion for in_progress requests');
    }

    // Защита от повторного подтверждения
    const field = isRequester ? 'requester_confirmed' : 'creator_confirmed';
    if (req[field] === true) {
      throw new Error('You have already confirmed this request');
    }

    // Обновляем подтверждение
    await pool.query(`
      UPDATE ad_requests
      SET ${field} = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [requestId]);

    // Проверяем, не завершили ли оба
    const updated = await pool.query(`SELECT * FROM ad_requests WHERE id = $1`, [requestId]);
    const updatedReq = updated.rows[0];

    if (updatedReq.requester_confirmed && updatedReq.creator_confirmed) {
      await pool.query(`
    UPDATE ad_requests
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [requestId]);

      await Notification.createNotification(
        updatedReq.requester_id,
        'request_completed',
        `Сделка по объявлению "${updatedReq.title}" завершена`,
        null
      );
      await Notification.createNotification(
        updatedReq.ad_owner_id,
        'request_completed',
        `Сделка по объявлению "${updatedReq.title}" завершена`,
        null
      );

      await pool.query(`
    UPDATE ads
    SET acceptance_status = 'open',
        accepted_by = NULL,
        accepted_at = NULL
    WHERE id = $1
  `, [req.ad_id]);
    }

    return updatedReq;
  } catch (err) {
    throw err;
  }
};

// Получить активные запросы пользователя
const getActiveRequests = async (userId) => {
  const result = await pool.query(`
    SELECT ar.*, ads.title, ads.category,
           u1.name as requester_name, u2.name as creator_name,
           ads.price as ad_price, ads.preferred_time as ad_preferred_time, ads.terms as ad_terms,
           ads.user_id as ad_owner_id
    FROM ad_requests ar
    JOIN ads ON ar.ad_id = ads.id
    JOIN users u1 ON ar.requester_id = u1.id
    JOIN users u2 ON ads.user_id = u2.id
    WHERE (ar.requester_id = $1 OR ads.user_id = $1)
      AND ar.status IN ('accepted', 'in_progress')
    ORDER BY ar.updated_at DESC
  `, [userId]);
  return result.rows;
};

// Удалить отклоненный запрос
const deleteDeclinedRequest = async (requestId, userId) => {
  try {
    // Проверяем, что запрос отклонен и пользователь имеет право удалить
    const request = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);

    if (request.rows.length === 0) {
      throw new Error('Request not found');
    }

    const req = request.rows[0];

    // Может удалить либо запрашивающий, либо владелец объявления
    if (req.requester_id !== userId && req.ad_owner_id !== userId) {
      throw new Error('Not authorized to delete this request');
    }

    // Удаляем только отклоненные (rejected) запросы
    if (req.current_status !== 'rejected') {
      throw new Error('Can only delete rejected requests');
    }

    const result = await pool.query(`
      DELETE FROM ad_requests
      WHERE id = $1
      RETURNING *
    `, [requestId]);

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

const cancelAdRequest = async (requestId, userId) => {
  try {
    // Получаем запрос и данные объявления
    const request = await pool.query(`
  SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status, ads.title
  FROM ad_requests ar
  JOIN ads ON ar.ad_id = ads.id
  WHERE ar.id = $1
`, [requestId]);

    if (request.rows.length === 0) throw new Error('Request not found');
    const req = request.rows[0];

    if (req.requester_id !== userId && req.ad_owner_id !== userId) throw new Error('Not authorized');

    // Разрешаем отмену для pending и accepted
    if (!['pending', 'accepted'].includes(req.current_status)) {
      throw new Error('Can only cancel pending or accepted requests');
    }

    // Обновляем статус запроса на cancelled
    const result = await pool.query(`
      UPDATE ad_requests
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [requestId]);

    // Если запрос был в статусе accepted, сбрасываем объявление
    if (req.current_status === 'accepted') {
      await pool.query(`
        UPDATE ads
        SET acceptance_status = 'open', accepted_by = NULL, accepted_at = NULL
        WHERE id = $1
      `, [req.ad_id]);
    }

    const otherUserId = (userId === req.requester_id) ? req.ad_owner_id : req.requester_id;
    await Notification.createNotification(
      otherUserId,
      'request_cancelled_by_user',
      `Договорённость по объявлению "${req.title}" отменена другой стороной`,
      null
    );

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Скрыть отклонённый запрос для конкретного пользователя (не удаляя из БД)
const hideRejectedRequest = async (requestId, userId, isIncoming) => {
  try {
    let field = isIncoming ? 'hidden_by_creator' : 'hidden_by_requester';
    const result = await pool.query(`
      UPDATE ad_requests
      SET ${field} = true
      WHERE id = $1
      RETURNING *
    `, [requestId]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Скрыть все отклонённые запросы для пользователя (по типу)
const hideAllRejectedRequests = async (userId, isIncoming) => {
  try {
    let field = isIncoming ? 'hidden_by_creator' : 'hidden_by_requester';
    // Определяем, какие запросы относятся к пользователю
    let condition = isIncoming
      ? `ads.user_id = $1`   // для входящих: автор объявления
      : `ar.requester_id = $1`; // для исходящих: запросивший

    const result = await pool.query(`
      UPDATE ad_requests ar
      SET ${field} = true
      FROM ads
      WHERE ar.ad_id = ads.id
        AND ${condition}
        AND ar.status = 'rejected'
        AND (ar.${field} IS NOT TRUE)
    `, [userId]);
    return result.rowCount;
  } catch (err) {
    throw err;
  }
};

// Автоотмена зависших принятых запросов
const autoCancelExpiredAcceptedRequests = async () => {
  try {
    // Находим все accepted-запросы, которые были приняты более 2 минут назад
    const expired = await pool.query(`
      SELECT ar.id, ar.ad_id, ar.requester_id, ar.accepted_at, ads.user_id as ad_owner_id, ads.title
FROM ad_requests ar
JOIN ads ON ar.ad_id = ads.id
WHERE ar.status = 'accepted'
  AND ar.accepted_at < NOW() - INTERVAL '2 minutes'
    `);

    for (const req of expired.rows) {
      // Обновляем статус запроса
      await pool.query(`
        UPDATE ad_requests
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND status = 'accepted'
      `, [req.id]);

      // Разблокируем объявление
      await pool.query(`
        UPDATE ads
        SET acceptance_status = 'open', accepted_by = NULL, accepted_at = NULL
        WHERE id = $1
      `, [req.ad_id]);

      // Уведомления для обоих участников (функцию создадим позже)
      await Notification.createNotification(
        req.requester_id,
        'request_auto_cancelled',
        `Договорённость по объявлению "${req.title}" автоматически отменена из-за отсутствия активности`,
        'Автоотмена'  // четвёртый параметр (title)
      );
      await Notification.createNotification(
        req.ad_owner_id,
        'request_auto_cancelled',
        `Договорённость по объявлению "${req.title}" автоматически отменена из-за отсутствия активности`,
        'Автоотмена'
      );
    }
    return expired.rowCount;
  } catch (err) {
    console.error('Error in autoCancelExpiredAcceptedRequests:', err);
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
  getActiveRequests,
  deleteDeclinedRequest,
  cancelAdRequest,
  startAdRequest,  // Новый метод для перехода accepted → in_progress
  hideRejectedRequest,
  hideAllRejectedRequests,
  autoCancelExpiredAcceptedRequests
};