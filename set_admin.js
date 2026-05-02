// set_admin.js
const pool = require('./src/database');

const PHONE = '+375000000000'; // замените на реальный номер

async function setAdmin() {
  const res = await pool.query('UPDATE users SET level = 4 WHERE phone = $1 RETURNING id, phone, level', [PHONE]);
  if (res.rows.length === 0) {
    console.log('Пользователь с таким телефоном не найден.');
  } else {
    console.log('✅ Администратор назначен:', res.rows[0]);
  }
  pool.end();
}
setAdmin();