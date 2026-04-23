// migration-remove-unique-constraint.js
const pool = require('./src/database');

async function runMigration() {
  console.log('🔄 Начинаем изменение ограничений в таблице ad_requests...');

  try {
    // 1. Удаляем старый UNIQUE constraint (если он существует)
    console.log('1. Удаляем ограничение ad_requests_ad_id_requester_id_key...');
    await pool.query(`
      ALTER TABLE ad_requests DROP CONSTRAINT IF EXISTS ad_requests_ad_id_requester_id_key;
    `);
    console.log('✅ Ограничение удалено (или его не было)');

    // 2. Создаём частичный уникальный индекс для активных статусов
    console.log('2. Создаём частичный уникальный индекс idx_active_request_per_ad_user...');
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_active_request_per_ad_user
      ON ad_requests (ad_id, requester_id)
      WHERE status IN ('pending', 'accepted', 'in_progress');
    `);
    console.log('✅ Частичный индекс создан');

    console.log('🎉 Миграция завершена успешно!');
  } catch (err) {
    console.error('❌ Ошибка при миграции:', err);
  } finally {
    pool.end(); // закрываем соединение
  }
}

runMigration();