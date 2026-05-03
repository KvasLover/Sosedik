const pool = require('../database');

const Points = {
  // Начислить баллы (проверяет дневной лимит)
  addPoints: async (userId, amount, actionType, referenceId = null) => {
    if (amount <= 0) throw new Error('Сумма должна быть положительной');

    // Проверка дневного лимита (20 баллов в сутки)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySum = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::int AS total
       FROM points_log
       WHERE user_id = $1
         AND amount > 0
         AND created_at >= $2`,
      [userId, todayStart]
    );
    const currentDayTotal = todaySum.rows[0].total;

    if (currentDayTotal + amount > 20) {
      throw new Error('Дневной лимит баллов (20) превышен');
    }

    // Запись операции
    const result = await pool.query(
      `INSERT INTO points_log (user_id, amount, action_type, reference_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, amount, actionType, referenceId]
    );

    // Обновляем баланс пользователя
    await pool.query(
      'UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2',
      [amount, userId]
    );

    return result.rows[0];
  },

  // Списать баллы
  spendPoints: async (userId, amount, actionType, referenceId = null) => {
    if (amount <= 0) throw new Error('Сумма должна быть положительной');

    // Проверка баланса
    const user = await pool.query('SELECT points FROM users WHERE id = $1', [userId]);
    if (!user.rows[0] || user.rows[0].points < amount) {
      throw new Error('Недостаточно баллов');
    }

    // Запись операции с отрицательной суммой
    const result = await pool.query(
      `INSERT INTO points_log (user_id, amount, action_type, reference_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, -amount, actionType, referenceId]
    );

    // Обновляем баланс
    await pool.query(
      'UPDATE users SET points = COALESCE(points, 0) - $1 WHERE id = $2',
      [amount, userId]
    );

    return result.rows[0];
  },

  // Получить текущий баланс
  getBalance: async (userId) => {
    const result = await pool.query(
      'SELECT COALESCE(points, 0) AS balance FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.balance || 0;
  },

  // Получить историю операций
  getHistory: async (userId, limit = 50) => {
    const result = await pool.query(
      `SELECT id, amount, action_type, reference_id, created_at
       FROM points_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  // Проверить, начислялись ли уже баллы за конкретное действие (по reference_id)
  isAlreadyAwarded: async (userId, actionType, referenceId) => {
    const result = await pool.query(
      `SELECT id FROM points_log
       WHERE user_id = $1
         AND action_type = $2
         AND reference_id = $3
       LIMIT 1`,
      [userId, actionType, referenceId]
    );
    return result.rows.length > 0;
  }
};

module.exports = Points;