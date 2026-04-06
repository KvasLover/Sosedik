const pool = require('./src/database');

async function listUsers() {
  try {
    const result = await pool.query('SELECT id, phone, level, name, apartment, show_apartment, verification_photo, points, created_at FROM users ORDER BY id');
    console.log('Все пользователи:');
    console.log('================');
    result.rows.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Телефон: ${user.phone}`);
      console.log(`Уровень: ${user.level}`);
      console.log(`Имя: ${user.name || 'Не указано'}`);
      console.log(`Квартира: ${user.apartment || 'Не указано'}`);
      console.log(`Показывать квартиру: ${user.show_apartment}`);
      console.log(`Фото верификации: ${user.verification_photo || 'Нет'}`);
      console.log(`Баллы: ${user.points}`);
      console.log(`Создан: ${user.created_at}`);
      console.log('----------------');
    });
    console.log(`Всего пользователей: ${result.rows.length}`);
  } catch (err) {
    console.error('Ошибка при получении пользователей:', err);
  } finally {
    await pool.end();
  }
}

listUsers();