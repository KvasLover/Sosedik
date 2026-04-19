const pool = require('./src/database');
const fs = require('fs');

async function runNotificationsMigration() {
  try {
    console.log('🚀 Начинаем миграцию уведомлений...');

    // Читаем файл миграции
    const migrationSQL = fs.readFileSync('./migration-notifications.sql', 'utf8');

    // Выполняем миграцию
    console.log('📋 Создаем таблицу notifications...');
    await pool.query(migrationSQL);

    console.log('✅ Миграция уведомлений завершена успешно!');
  } catch (err) {
    console.error('❌ Ошибка миграции:', err);
  } finally {
    process.exit();
  }
}

runNotificationsMigration();