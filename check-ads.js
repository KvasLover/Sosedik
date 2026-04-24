const pool = require('./src/database');

async function check() {
  const res = await pool.query('SELECT id, title, price, preferred_time, terms FROM ads ORDER BY id DESC LIMIT 5;');
  console.table(res.rows);
  pool.end();
}
check();