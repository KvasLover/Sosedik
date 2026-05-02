// check_user_level.js
const pool = require('./src/database');

async function checkUserLevelColumn() {
  const res = await pool.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'level'
  `);
  if (res.rows.length === 0) {
    console.log('❌ Колонка level не найдена!');
  } else {
    console.log('✅ Колонка level:', res.rows[0]);
  }
  const users = await pool.query('SELECT id, phone, level FROM users LIMIT 5');
  console.log('Первые 5 пользователей:', users.rows);
  pool.end();
}
checkUserLevelColumn();