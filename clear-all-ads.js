const pool = require('./src/database');

async function clearAllAds() {
  console.log('Начинаю удаление всех объявлений и связанных данных...');
  try {
    // Удаляем все данные из связанных таблиц (порядок важен из-за внешних ключей)
    await pool.query('DELETE FROM request_messages');       // сообщения чатов сделок
    await pool.query('DELETE FROM ad_requests');             // запросы на объявления
    await pool.query('DELETE FROM reviews');                 // отзывы
    await pool.query('DELETE FROM points_log WHERE reference_id IN (SELECT id FROM ads)'); // баллы за объявления
    await pool.query('DELETE FROM favorites');               // избранное (всех типов)
    
    // Удаляем сами объявления
    const result = await pool.query('DELETE FROM ads RETURNING id');
    
    // На всякий случай очищаем устаревшую таблицу rentals (если есть)
    await pool.query('DELETE FROM rentals');
    
    console.log(`Удалено объявлений: ${result.rowCount}`);
    console.log('Готово! Все объявления, запросы, отзывы и связанные данные очищены.');
    process.exit(0);
  } catch (err) {
    console.error('Ошибка при удалении:', err.message);
    process.exit(1);
  }
}

clearAllAds();