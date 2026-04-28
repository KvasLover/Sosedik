const pool = require('./src/database');
async function check() {
  const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='reviews'`);
  console.table(res.rows);
  pool.end();
}
check();