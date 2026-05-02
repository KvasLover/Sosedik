const pool = require('./src/database');

async function run() {
  console.log('Добавляем поля requester_return_confirmed и creator_return_confirmed в ad_requests...');
  await pool.query(`
    ALTER TABLE ad_requests
    ADD COLUMN IF NOT EXISTS requester_return_confirmed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS creator_return_confirmed BOOLEAN DEFAULT FALSE;
  `);
  console.log('Готово');
  pool.end();
}
run();