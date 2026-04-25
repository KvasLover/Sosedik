const pool = require('./src/database');
async function check() {
  const res = await pool.query('SELECT id, status, agreed_price, agreed_time, agreement_comment FROM ad_requests LIMIT 5;');
  console.table(res.rows);
  pool.end();
}
check();