const pool = require('./src/database');

async function run() {
  const res = await pool.query(`
    SELECT column_name, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    ORDER BY ordinal_position;
  `);
  console.table(res.rows);
  pool.end();
}
run();