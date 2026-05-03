// scripts/create-admin.js
const bcrypt = require('bcryptjs');
const pool = require('./src/database');

const phone = process.argv[2]; // передаём первым аргументом, например: +375291234567
const password = process.argv[3]; // вторым аргументом

if (!phone || !password) {
  console.error('Укажите телефон и пароль аргументами: node scripts/create-admin.js +375291234567 mypassword');
  process.exit(1);
}

async function createAdmin() {
  try {
    // Проверка, существует ли уже такой пользователь
    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      console.log('Пользователь с таким номером уже существует. Меняю ему уровень на 4...');
      await pool.query('UPDATE users SET level = 4 WHERE phone = $1', [phone]);
      console.log('Уровень обновлён.');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (phone, password_hash, level)
       VALUES ($1, $2, $3)
       RETURNING id, phone, level`,
      [phone, passwordHash, 4]
    );

    console.log('Администратор создан:', result.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  }
}

createAdmin();