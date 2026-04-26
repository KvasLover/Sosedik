const pool = require('./src/database');

async function run() {
  console.log('Добавление accepted_at в ad_requests...');
  await pool.query(`
    ALTER TABLE ad_requests
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
  `);
  console.log('Готово');
  pool.end();
}
run();