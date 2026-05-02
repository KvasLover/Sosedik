const pool = require('../database');

// Получить всех пользователей с их объявлениями и статистикой
const getAllUsers = async () => {
  const result = await pool.query(`
    SELECT u.id, u.phone, u.name, u.level, u.points, u.created_at,
           COUNT(ads.id) AS ads_count
    FROM users u
    LEFT JOIN ads ON ads.user_id = u.id
    WHERE u.level < 4
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  return result.rows;
};

// Изменить уровень пользователя
const setUserLevel = async (userId, newLevel) => {
  const result = await pool.query(
    'UPDATE users SET level = $2 WHERE id = $1 RETURNING id, level',
    [userId, newLevel]
  );
  if (result.rows.length === 0) throw new Error('Пользователь не найден');
  return result.rows[0];
};

// Получить статистику
const getStats = async () => {
  const usersByLevel = await pool.query(
    'SELECT level, COUNT(*) as count FROM users GROUP BY level ORDER BY level'
  );
  const totalAds = await pool.query('SELECT COUNT(*) as count FROM ads WHERE active = true');
  const totalDeals = await pool.query('SELECT COUNT(*) as count FROM ad_requests WHERE status = $1', ['completed']);
  
  return {
    usersByLevel: usersByLevel.rows,
    totalActiveAds: parseInt(totalAds.rows[0].count),
    totalCompletedDeals: parseInt(totalDeals.rows[0].count)
  };
};

// Получить все объявления (активные и неактивные) для модерации
const getAllAds = async () => {
  const result = await pool.query(`
    SELECT ads.id, ads.title, ads.category, ads.type, ads.active, ads.created_at,
           u.name AS author_name, u.phone AS author_phone
    FROM ads
    JOIN users u ON ads.user_id = u.id
    ORDER BY ads.created_at DESC
  `);
  return result.rows;
};

// Удалить объявление админом
const adminDeleteAd = async (adId) => {
  await pool.query('DELETE FROM ads WHERE id = $1', [adId]);
};

module.exports = { getAllUsers, setUserLevel, getStats, getAllAds, adminDeleteAd };