const pool = require('../database');

// Создать заявку на верификацию
const createRequest = async (userId, photoBase64) => {
  const result = await pool.query(
    `INSERT INTO verification_requests (user_id, photo)
     VALUES ($1, $2)
     RETURNING id, user_id, status, created_at`,
    [userId, photoBase64]
  );
  return result.rows[0];
};

// Проверить, есть ли ожидающая заявка для пользователя
const hasPendingRequest = async (userId) => {
  const result = await pool.query(
    `SELECT id FROM verification_requests
     WHERE user_id = $1 AND status = 'pending'
     LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0;
};

// Получить все ожидающие заявки (для модератора)
const getPendingRequests = async () => {
  const result = await pool.query(
    `SELECT vr.id, vr.user_id, vr.photo, vr.created_at,
            u.name, u.phone, u.apartment
     FROM verification_requests vr
     JOIN users u ON vr.user_id = u.id
     WHERE vr.status = 'pending'
     ORDER BY vr.created_at ASC`
  );
  return result.rows;
};

// Обновить статус заявки (одобрить/отклонить)
const updateRequestStatus = async (requestId, status, reviewerId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Обновляем заявку
    const result = await client.query(
      `UPDATE verification_requests
       SET status = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, reviewerId, requestId]
    );
    const request = result.rows[0];

    if (status === 'approved') {
      // Повышаем уровень пользователя до 2
      await client.query(
        'UPDATE users SET level = 2 WHERE id = $1',
        [request.user_id]
      );
    }

    await client.query('COMMIT');
    return request;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  createRequest,
  hasPendingRequest,
  getPendingRequests,
  updateRequestStatus,
};