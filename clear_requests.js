// clear_requests.js
const pool = require('./src/database');

async function clearAllRequests() {
  const client = await pool.connect();
  try {
    // Сначала удаляем сообщения запросов
    await client.query('DELETE FROM request_messages');
    console.log('✅ Сообщения запросов удалены');

    // Затем удаляем сами запросы
    const res = await client.query('DELETE FROM ad_requests RETURNING id');
    console.log(`✅ Удалено запросов: ${res.rowCount}`);

    // Сбрасываем accepted_by у объявлений
    await client.query("UPDATE ads SET acceptance_status = 'open', accepted_by = NULL, accepted_at = NULL");
    console.log('✅ Объявления сброшены в статус open');

    console.log('Готово. Все запросы и их сообщения удалены.');
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

clearAllRequests();