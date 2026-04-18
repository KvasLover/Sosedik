const pool = require('./src/database');

async function runMigration() {
  try {
    console.log('🚀 Начинаем миграцию системы объявлений...');

    // Добавляем недостающие поля в таблицу ads
    console.log('📝 Добавляем поля price, contact, acceptance_status, expires_at в таблицу ads...');
    await pool.query(`
      ALTER TABLE ads ADD COLUMN IF NOT EXISTS price NUMERIC;
      ALTER TABLE ads ADD COLUMN IF NOT EXISTS contact VARCHAR(255);
      ALTER TABLE ads ADD COLUMN IF NOT EXISTS acceptance_status VARCHAR(20) DEFAULT 'open';
      ALTER TABLE ads ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
    `);

    // Создаем таблицу ad_requests
    console.log('📋 Создаем таблицу ad_requests...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_requests (
        id SERIAL PRIMARY KEY,
        ad_id INTEGER REFERENCES ads(id) ON DELETE CASCADE,
        requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        message TEXT,
        decline_reason TEXT,
        chat_id INTEGER, -- опциональный чат (ссылка добавится позже)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        requester_confirmed BOOLEAN DEFAULT FALSE,
        creator_confirmed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        UNIQUE(ad_id, requester_id)
      );
    `);

    // Создаем индексы
    console.log('🔍 Создаем индексы для производительности...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ad_requests_ad_id ON ad_requests(ad_id);
      CREATE INDEX IF NOT EXISTS idx_ad_requests_requester_id ON ad_requests(requester_id);
      CREATE INDEX IF NOT EXISTS idx_ad_requests_status ON ad_requests(status);
    `);

    // Создаем триггер для updated_at
    console.log('⚡ Создаем триггер для автоматического обновления updated_at...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_ad_requests_updated_at ON ad_requests;
      CREATE TRIGGER update_ad_requests_updated_at
          BEFORE UPDATE ON ad_requests
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Миграция завершена успешно!');
    console.log('📊 Структура БД обновлена для новой системы принятия объявлений');

  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();