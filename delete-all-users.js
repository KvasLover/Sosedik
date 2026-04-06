console.log('Запуск скрипта удаления пользователей...');

const pool = require('./src/database');
console.log('БД подключена.');

async function deleteAllUsers() {
  try {
    console.log('Удаляем все объявления...');
    await pool.query('DELETE FROM ads');

    console.log('Удаляем все запросы на аренду...');
    await pool.query('DELETE FROM rental_requests');

    console.log('Удаляем все предметы для аренды...');
    await pool.query('DELETE FROM rentals');

    console.log('Удаляем всех пользователей...');
    const result = await pool.query('DELETE FROM users');

    console.log(`Удалено пользователей: ${result.rowCount}`);
    console.log('Все пользователи и связанные данные удалены.');
  } catch (err) {
    console.error('Ошибка при удалении:', err);
  } finally {
    await pool.end();
  }
}

if (process.argv.includes('--confirm')) {
  deleteAllUsers();
} else {
  console.log('ВНИМАНИЕ: Этот скрипт удалит ВСЕХ пользователей и все связанные данные!');
  console.log('Это действие нельзя отменить.');
  console.log('Для выполнения удаления добавьте --confirm: node delete-all-users.js --confirm');
}