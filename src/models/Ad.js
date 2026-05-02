const pool = require('../database');
const Notification = require('./Notification');

// Get all active ads
const getAds = async (filters = {}) => {
  let query = `SELECT ads.id, ads.user_id, ads.category, ads.title, ads.description, 
               ads.price, ads.contact, ads.created_at, ads.active, ads.accepted_by, 
               users.name as acceptor_name, author.name as author_name, 
               ads.preferred_time, ads.terms,
               ads.deposit, ads.value_category, ads.item_name, ads.condition_description
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
const createAd = async (
  userId, category, title, description, price = null, contact = null,
  preferredTime = null, terms = null, type = 'service',
  itemName = null, itemDescription = null, deposit = null, conditionDescription = null,
  valueCategory = null
) => {
  try {
    const result = await pool.query(`
      INSERT INTO ads (
  user_id, category, title, description, price, contact,
  preferred_time, terms, type, item_name, item_description, deposit, condition_description,
  value_category
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [userId, category, title, description, price, contact, preferredTime, terms,
      type, itemName, itemDescription, deposit, conditionDescription, valueCategory]);
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
      null,
      requestId,          // related_id
      'request'           // related_type
    );

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// Начать выполнение работы (переводит accepted → in_progress)
// Может быть вызвано только если запрос в статусе accepted
// Доступно для обеих сторон

const startAdRequest = async (requestId, userId, agreedPrice = null, agreedTime = null, agreementComment = null, itemConditionStart = null, agreedDeposit = null) => {
  try {
    const request = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status,
             ads.price as ad_price, ads.preferred_time as ad_time, ads.terms as ad_terms,
             ads.title, ads.type
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);

    if (request.rows.length === 0) throw new Error('Request not found');
    const req = request.rows[0];

    if (req.current_status !== 'accepted') throw new Error('Can only start accepted requests');
    if (req.ad_owner_id !== userId && req.requester_id !== userId) throw new Error('Not authorized');

    // Определяем, является ли вызов сбросом предложения (отклонение)
    const isClearProposal = (agreedPrice === null || agreedPrice === undefined) &&
      (agreedTime === null || agreedTime === undefined) &&
      (agreementComment === null || agreementComment === undefined) &&
      (itemConditionStart === null || itemConditionStart === undefined);

    // Проверка обязательности поля состояния для аренды ТОЛЬКО если это не сброс
    if (!isClearProposal && req.type === 'rental' && !itemConditionStart) {
      throw new Error('For rental, item condition at transfer is required');
    }

    if (isClearProposal) {
      // Сброс предложения (отклонение)
      await pool.query(`
        UPDATE ad_requests
        SET proposed_price = NULL,
            proposed_time = NULL,
            proposed_comment = NULL,
            proposed_condition = NULL,
            proposed_by = NULL,
            proposal_created_at = NULL,
            updated_at = NOW()
        WHERE id = $1
      `, [requestId]);
      // Уведомление об отклонении (опционально)
      // ... (можете добавить уведомление, если нужно)
    } else {
      // Сохраняем предложение
      await pool.query(`
  UPDATE ad_requests
  SET proposed_price = $2,
      proposed_time = $3,
      proposed_comment = $4,
      proposed_condition = $5,
      proposed_deposit = $7,
      proposed_by = $6,
      proposal_created_at = NOW(),
      updated_at = NOW()
  WHERE id = $1
`, [requestId, agreedPrice, agreedTime, agreementComment, itemConditionStart, userId, agreedDeposit]);

      const otherUserId = (userId === req.requester_id) ? req.ad_owner_id : req.requester_id;
      let proposalText = `Пользователь предложил условия: цена ${agreedPrice || 'не указана'}, время ${agreedTime || 'не указано'}, комментарий: ${agreementComment || 'нет'}`;
      if (req.type === 'rental' && itemConditionStart) {
        proposalText += `, состояние при передаче: ${itemConditionStart}`;
      }
      await Notification.createNotification(
        otherUserId,
        'request_proposal_created',
        proposalText,
        null,
        requestId,
        'request'
      );
    }

    return { status: isClearProposal ? 'proposal_cleared' : 'proposal_created', requestId };
  } catch (err) {
    throw err;
  }
};

// Отклонить запрос на объявление (статус: pending → rejected)
const declineAdRequest = async (requestId, userId, reason) => {
  try {
    const request = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status, ads.title
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);

    if (request.rows.length === 0) throw new Error('Request not found');
    const req = request.rows[0];

    if (req.ad_owner_id !== userId) throw new Error('Not authorized to decline this request');
    if (req.current_status !== 'pending') throw new Error('Can only decline pending requests');

    const result = await pool.query(`
      UPDATE ad_requests
      SET status = 'rejected', decline_reason = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [requestId, reason]);

    // Уведомление отправителю запроса
    await Notification.createNotification(
      req.requester_id,
      'request_rejected',
      `Ваш запрос на объявление "${req.title}" был отклонён. Причина: "${reason}"`,
      null
    );

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

    // Если это аренда и возврат не подтверждён, нельзя завершить
    if (req.type === 'rental' && !req.item_return_confirmed) {
      throw new Error('Cannot complete rental deal without confirming return');
    }

    if (req.current_status === 'disputed') {
      throw new Error('Cannot complete disputed request');
    }

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

    // Получаем обновлённую запись
    const updated = await pool.query(`SELECT * FROM ad_requests WHERE id = $1`, [requestId]);
    const updatedReq = updated.rows[0];

    // Если оба подтвердили → завершаем сделку, уведомление - только первому подтвердившему
    if (updatedReq.requester_confirmed && updatedReq.creator_confirmed) {
      await pool.query(`
    UPDATE ad_requests
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [requestId]);

      // Уведомления обоим участникам
      await Notification.createNotification(
        req.requester_id,
        'review_reminder',
        `Сделка по объявлению "${req.title}" завершена. Оцените результат во вкладке «Сделки» в Профиле.`,
        null,
        requestId,
        'request'
      );
      await Notification.createNotification(
        req.ad_owner_id,
        'review_reminder',
        `Сделка по объявлению "${req.title}" завершена. Оцените результат во вкладке «Сделки» в Профиле.`,
        null,
        requestId,
        'request'
      );

      await pool.query(`
    UPDATE ads
    SET acceptance_status = 'open',
        accepted_by = NULL,
        accepted_at = NULL
    WHERE id = $1
  `, [req.ad_id]);
    } else {
      // Только один подтвердил → уведомляем другую сторону о первом подтверждении
      const otherUserId = (userId === updatedReq.requester_id) ? req.ad_owner_id : updatedReq.requester_id;
      await Notification.createNotification(
        otherUserId,
        'request_pending_completion',
        `Партнёр подтвердил выполнение. Пожалуйста, подтвердите и вы, чтобы завершить сделку.`,
        null,
        requestId,          // related_id
        'request'           // related_type
      );
    }

    return updatedReq;
  } catch (err) {
    throw err;
  }
};

// Получить активные запросы пользователя
const getActiveRequests = async (userId) => {
  const result = await pool.query(`
    SELECT ar.*, ads.title, ads.category, ads.type,
       u1.name as requester_name, u2.name as creator_name,
       ads.price as ad_price, ads.preferred_time as ad_preferred_time, ads.terms as ad_terms,
       ads.user_id as ad_owner_id
    FROM ad_requests ar
    JOIN ads ON ar.ad_id = ads.id
    JOIN users u1 ON ar.requester_id = u1.id
    JOIN users u2 ON ads.user_id = u2.id
    WHERE (ar.requester_id = $1 OR ads.user_id = $1)
      AND ar.status IN ('accepted', 'in_progress', 'disputed')
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
    const request = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status, ads.title
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);

    if (request.rows.length === 0) throw new Error('Request not found');
    const req = request.rows[0];

    // Проверка прав и допустимых статусов
    if (req.current_status === 'pending') {
      if (req.requester_id !== userId) throw new Error('Only requester can cancel a pending request');
    } else if (req.current_status === 'accepted') {
      if (req.requester_id !== userId && req.ad_owner_id !== userId) throw new Error('Not authorized to cancel this accepted request');
    } else if (req.current_status === 'disputed') {
      if (req.requester_id !== userId && req.ad_owner_id !== userId) throw new Error('Not authorized to cancel this disputed deal');
    } else {
      throw new Error('Can only cancel pending, accepted or disputed requests');
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
    } else if (req.current_status === 'disputed') {
      // Разблокируем объявление
      await pool.query(`
    UPDATE ads
    SET acceptance_status = 'open', accepted_by = NULL, accepted_at = NULL
    WHERE id = $1
  `, [req.ad_id]);

      // Системное сообщение в чат
      await pool.query(`
    INSERT INTO request_messages (request_id, sender_id, text)
    VALUES ($1, $2, $3)
  `, [requestId, userId, 'Сделка отменена из-за спора.']);
    }

    // Отправка уведомления
    let otherUserId = null;
    let message = '';
    let type = '';

    if (req.current_status === 'pending') {
      // Отменяет requester → уведомляем автора объявления
      if (userId === req.requester_id) {
        otherUserId = req.ad_owner_id;
        type = 'pending_request_cancelled';
        message = `Пользователь ${userId === req.requester_id ? 'отменил свой запрос' : 'отменил запрос'} на объявление "${req.title}"`;
        // Уточним имя отправителя? Можно получить имя, но для простоты так.
        // Лучше: const requesterName = ...; но у нас нет имени в req. Можно сделать отдельный запрос.
        // Пока оставим общий текст.
        message = `Пользователь отменил свой запрос на объявление "${req.title}"`;
      } else {
        // Если бы автор отменял pending (но мы запретили), но на всякий случай:
        otherUserId = req.requester_id;
        type = 'pending_request_cancelled_by_author';
        message = `Владелец объявления отменил ваш запрос на "${req.title}"`;
      }
    } else if (req.current_status === 'accepted') {
      otherUserId = (userId === req.requester_id) ? req.ad_owner_id : req.requester_id;
      type = 'request_cancelled_by_user';
      message = `Договорённость по объявлению "${req.title}" отменена другой стороной`;
    } else if (req.current_status === 'disputed') {
      otherUserId = (userId === req.requester_id) ? req.ad_owner_id : req.requester_id;
      type = 'request_cancelled_by_user';
      message = `Сделка по объявлению "${req.title}" отменена из-за спора`;
    }

    if (otherUserId) {
      await Notification.createNotification(
        otherUserId,
        type,
        message,
        null,
        requestId,
        'request'
      );
    }

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
        null,
        req.id,             // related_id
        'request'           // related_type
      );
      await Notification.createNotification(
        req.ad_owner_id,
        'request_auto_cancelled',
        `Договорённость по объявлению "${req.title}" автоматически отменена из-за отсутствия активности`,
        null,
        req.id,
        'request'
      );
    }
    return expired.rowCount;
  } catch (err) {
    console.error('Error in autoCancelExpiredAcceptedRequests:', err);
  }
};

const acceptProposal = async (requestId, userId) => {
  try {
    const request = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status,
             ar.proposed_price, ar.proposed_time, ar.proposed_comment, ar.proposed_by,
             ar.proposed_condition,
             ads.title, ads.type
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);

    if (request.rows.length === 0) throw new Error('Request not found');
    const req = request.rows[0];

    if (req.current_status !== 'accepted') throw new Error('Can only accept proposal for accepted request');
    if (req.ad_owner_id !== userId && req.requester_id !== userId) throw new Error('Not authorized');
    if (req.proposed_by === userId) throw new Error('You cannot accept your own proposal');
    if (!req.proposed_by) {
      throw new Error('No active proposal');
    }
    if (req.type === 'rental' && !req.proposed_condition) {
      throw new Error('For rental, item condition at transfer is required in proposal');
    }

    const result = await pool.query(`
      UPDATE ad_requests
      SET status = 'in_progress',
          agreed_price = proposed_price,
          agreed_time = proposed_time,
          agreement_comment = proposed_comment,
          item_condition_start = proposed_condition,
          agreed_deposit = proposed_deposit,
          proposed_price = NULL,
          proposed_time = NULL,
          proposed_comment = NULL,
          proposed_condition = NULL,
          proposed_by = NULL,
          proposal_created_at = NULL,
          updated_at = NOW()
      WHERE id = $1 AND status = 'accepted'
      RETURNING *
    `, [requestId]);

    await Notification.createNotification(
      req.proposed_by,
      'request_proposal_accepted',
      `Ваше предложение принято, работа начата`,
      null,
      requestId,
      'request'
    );

    if (req.type === 'rental') {
      await pool.query(`
        INSERT INTO request_messages (request_id, sender_id, text)
        VALUES ($1, $2, $3)
      `, [requestId, userId, `Зафиксировано состояние предмета при передаче: ${req.proposed_condition}`]);
    }

    return { status: 'in_progress', requestId };
  } catch (err) {
    throw err;
  }
};

const openDispute = async (requestId, userId, reason) => {
  try {
    // 1. Проверяем существование и права
    const requestCheck = await pool.query(`
      SELECT ar.id, ar.status, ar.requester_id, ads.user_id as ad_owner_id
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);
    if (requestCheck.rows.length === 0) throw new Error('Request not found');
    const req = requestCheck.rows[0];
    if (req.status !== 'in_progress') throw new Error('Cannot open dispute: request not in progress');
    if (req.requester_id !== userId && req.ad_owner_id !== userId) throw new Error('Not authorized');

    // 2. Обновляем статус
    const result = await pool.query(`
      UPDATE ad_requests
      SET status = 'disputed',
          dispute_reason = $2,
          dispute_initiator_id = $3,
          disputed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [requestId, reason || null, userId]);

    // 3. Отправляем уведомление другому участнику
    const otherUserId = (userId === req.requester_id) ? req.ad_owner_id : req.requester_id;
    // Получаем название объявления
    const adTitle = await pool.query(`
      SELECT title FROM ads WHERE id = (SELECT ad_id FROM ad_requests WHERE id = $1)
    `, [requestId]);
    const title = adTitle.rows[0]?.title || 'сделка';
    await Notification.createNotification(
      otherUserId,
      'dispute_opened',
      `Открыт спор по сделке "${title}"`,
      null,
      requestId,
      'request'
    );

    // Системное сообщение в чат
    await pool.query(`
  INSERT INTO request_messages (request_id, sender_id, text)
  VALUES ($1, $2, $3)
`, [requestId, userId, 'Открыт спор по сделке.']);

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

const resolveDispute = async (requestId, userId) => {
  try {
    // 1. Проверяем существование и права
    const check = await pool.query(`
      SELECT ar.id, ar.status, ar.requester_id, ads.user_id as ad_owner_id
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);
    if (check.rows.length === 0) throw new Error('Request not found');
    const req = check.rows[0];
    if (req.status !== 'disputed') throw new Error('Cannot resolve dispute: request not disputed');
    if (req.requester_id !== userId && req.ad_owner_id !== userId) throw new Error('Not authorized');

    // 2. Обновляем статус
    const result = await pool.query(`
      UPDATE ad_requests
      SET status = 'in_progress',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [requestId]);

    // 3. Отправляем уведомление и системное сообщение
    // (получаем title для уведомления)
    const titleRes = await pool.query(`
      SELECT title FROM ads WHERE id = (SELECT ad_id FROM ad_requests WHERE id = $1)
    `, [requestId]);
    const title = titleRes.rows[0]?.title || 'сделка';
    const otherUserId = (userId === req.requester_id) ? req.ad_owner_id : req.requester_id;

    await Notification.createNotification(
      otherUserId,
      'dispute_resolved',
      `Спор по сделке "${title}" снят. Можно продолжить выполнение.`,
      null,
      requestId,
      'request'
    );

    await pool.query(`
      INSERT INTO request_messages (request_id, sender_id, text)
      VALUES ($1, $2, $3)
    `, [requestId, userId, 'Спор снят. Стороны продолжили выполнение сделки.']);

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

const confirmReturn = async (requestId, userId, conditionEnd = null) => {
  try {
    const request = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status, ads.type,
             ar.requester_return_confirmed, ar.creator_return_confirmed,
             ar.return_proposed_by, ads.title
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);
    if (request.rows.length === 0) throw new Error('Request not found');
    const req = request.rows[0];
    if (req.status !== 'in_progress') throw new Error('Cannot confirm return: deal not in progress');
    if (req.type !== 'rental') throw new Error('Only rental deals have return confirmation');
    if (req.requester_id !== userId && req.ad_owner_id !== userId) throw new Error('Not authorized');
    if (req.return_proposed_by) throw new Error('Return proposal already exists');
    if (!conditionEnd) throw new Error('Condition after return is required for rental');

    await pool.query(`
      UPDATE ad_requests
      SET return_proposed_by = $2,
          return_proposed_condition = $3,
          updated_at = NOW()
      WHERE id = $1
    `, [requestId, userId, conditionEnd]);

    const otherUserId = (userId === req.requester_id) ? req.ad_owner_id : req.requester_id;
    await Notification.createNotification(
      otherUserId,
      'return_proposed',
      `Пользователь предложил подтвердить возврат по сделке "${req.title}". Состояние: ${conditionEnd}`,
      null,
      requestId,
      'request'
    );

    await pool.query(`
      INSERT INTO request_messages (request_id, sender_id, text)
      VALUES ($1, $2, $3)
    `, [requestId, userId, `Предложен возврат. Состояние после возврата: ${conditionEnd}`]);

    return { status: 'return_proposed', requestId };
  } catch (err) {
    throw err;
  }
};

const acceptReturn = async (requestId, userId) => {
  try {
    const request = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status, ads.title
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);
    if (request.rows.length === 0) throw new Error('Request not found');
    const req = request.rows[0];
    if (req.status !== 'in_progress') throw new Error('Deal not in progress');
    if (!req.return_proposed_by) throw new Error('No active return proposal');
    if (req.return_proposed_by === userId) throw new Error('You cannot accept your own proposal');
    if (req.requester_id !== userId && req.ad_owner_id !== userId) throw new Error('Not authorized');

    await pool.query(`
      UPDATE ad_requests
      SET status = 'completed',
          completed_at = NOW(),
          requester_return_confirmed = true,
          creator_return_confirmed = true,
          updated_at = NOW()
      WHERE id = $1
    `, [requestId]);

    await Notification.createNotification(req.requester_id, 'review_reminder', `Сделка по объявлению "${req.title}" завершена. Оцените результат.`, null, requestId, 'request');
    await Notification.createNotification(req.ad_owner_id, 'review_reminder', `Сделка по объявлению "${req.title}" завершена. Оцените результат.`, null, requestId, 'request');

    await pool.query(`UPDATE ads SET acceptance_status = 'open', accepted_by = NULL, accepted_at = NULL WHERE id = $1`, [req.ad_id]);

    await pool.query(`INSERT INTO request_messages (request_id, sender_id, text) VALUES ($1, $2, 'Возврат подтверждён. Сделка завершена.')`, [requestId, userId]);

    return { status: 'completed', requestId };
  } catch (err) {
    throw err;
  }
};

const declineReturn = async (requestId, userId) => {
  try {
    const request = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id, ar.status as current_status, ads.title
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);
    if (request.rows.length === 0) throw new Error('Request not found');
    const req = request.rows[0];
    if (req.status !== 'in_progress') throw new Error('Deal not in progress');
    if (!req.return_proposed_by) throw new Error('No active return proposal');
    if (req.return_proposed_by === userId) throw new Error('You cannot decline your own proposal');
    if (req.requester_id !== userId && req.ad_owner_id !== userId) throw new Error('Not authorized');

    await pool.query(`
      UPDATE ad_requests
      SET return_proposed_by = NULL,
          return_proposed_condition = NULL,
          updated_at = NOW()
      WHERE id = $1
    `, [requestId]);

    const initiatorId = req.return_proposed_by;
    await Notification.createNotification(initiatorId, 'return_declined', `Ваше предложение возврата по сделке "${req.title}" отклонено.`, null, requestId, 'request');
    await pool.query(`INSERT INTO request_messages (request_id, sender_id, text) VALUES ($1, $2, 'Предложение возврата отклонено.')`, [requestId, userId]);

    return { status: 'in_progress', requestId };
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
  getActiveRequests,
  deleteDeclinedRequest,
  cancelAdRequest,
  startAdRequest,  // Новый метод для перехода accepted → in_progress
  hideRejectedRequest,
  hideAllRejectedRequests,
  autoCancelExpiredAcceptedRequests,
  acceptProposal,
  openDispute,
  resolveDispute,
  confirmReturn,
  acceptReturn,
  declineReturn
};