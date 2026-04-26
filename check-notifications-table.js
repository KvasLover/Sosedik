const pool = require('./src/database');

async function check() {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'notifications'
    ORDER BY ordinal_position;
  `);
  console.table(res.rows);
  pool.end();
}
check();