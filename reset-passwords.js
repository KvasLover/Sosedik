const bcrypt = require('bcryptjs');
const pool = require('./src/database');

async function resetPasswords() {
  try {
    const newPassword = '123456'; // Новый пароль для всех пользователей
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    console.log('Сбрасываем пароли всех пользователей на "123456"...');

    const result = await pool.query('UPDATE users SET password_hash = $1', [passwordHash]);

    console.log(`Пароли сброшены для ${result.rowCount} пользователей.`);
    console.log('Теперь вы можете войти с любым телефоном и паролем "123456" для удаления аккаунта.');
  } catch (err) {
    console.error('Ошибка при сбросе паролей:', err);
  } finally {
    await pool.end();
  }
}

resetPasswords();