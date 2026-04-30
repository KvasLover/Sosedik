const pool = require('./src/database');

async function run() {
  console.log('Добавление полей для спора в ad_requests...');
  await pool.query(`
    ALTER TABLE ad_requests
    ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
    ADD COLUMN IF NOT EXISTS dispute_initiator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP;
  `);
  console.log('Готово');
  pool.end();
}
run();