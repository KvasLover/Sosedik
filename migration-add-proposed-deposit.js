const pool = require('./src/database');

async function run() {
  console.log('Добавляем поле proposed_deposit в ad_requests...');
  await pool.query(`
    ALTER TABLE ad_requests ADD COLUMN IF NOT EXISTS proposed_deposit NUMERIC;
  `);
  console.log('Готово');
  pool.end();
}
run();