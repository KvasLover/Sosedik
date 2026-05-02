const pool = require('./src/database');

async function run() {
  console.log('Добавляем поле agreed_deposit в ad_requests...');
  await pool.query(`
    ALTER TABLE ad_requests ADD COLUMN IF NOT EXISTS agreed_deposit NUMERIC;
  `);
  console.log('Готово');
  pool.end();
}
run();