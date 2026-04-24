const pool = require('./src/database');

async function runMigration() {
  console.log('🔄 Добавление полей preferred_time и terms в таблицу ads...');
  try {
    await pool.query(`
      ALTER TABLE ads 
      ADD COLUMN IF NOT EXISTS preferred_time VARCHAR(255),
      ADD COLUMN IF NOT EXISTS terms TEXT;
    `);
    console.log('✅ Поля успешно добавлены (или уже существовали)');
  } catch (err) {
    console.error('❌ Ошибка при добавлении полей:', err);
  } finally {
    pool.end();
  }
}

runMigration();