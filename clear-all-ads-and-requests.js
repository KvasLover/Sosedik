const pool = require('./src/database');

async function clearData() {
  
  try {
    // Сначала удаляем все запросы (хотя из-за CASCADE они удалятся и так, но для порядка)
    console.log('🗑 Удаление всех запросов...');
    await pool.query('DELETE FROM ad_requests;');
    console.log('✅ Запросы удалены');

    console.log('🗑 Удаление всех объявлений...');
    await pool.query('DELETE FROM ads;');
    console.log('✅ Объявления удалены');

    console.log('🎉 База данных очищена от объявлений и запросов.');
  } catch (err) {
    console.error('❌ Ошибка при очистке:', err);
  } finally {
    pool.end();
  }
}

clearData();