// check_admin.js
const pool = require('./src/database');
const PHONE = '+37533'; // ваш номер администратора

async function checkAdmin() {
  const res = await pool.query('SELECT id, phone, level FROM users WHERE phone = $1', [PHONE]);
  console.log('Найден пользователь:', res.rows[0]);
  pool.end();
}
checkAdmin();