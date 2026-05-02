const pool = require('./src/database');

async function clearAllDeals() {
  console.log('⚠️ ВНИМАНИЕ! Скрипт удалит ВСЕ записи из ad_requests и сбросит статусы объявлений.');
  console.log('Нажмите Ctrl+C в течение 5 секунд для отмены...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    // Сброс полей объявлений, которые ссылаются на удаляемые запросы
    console.log('Сбрасываем поля объявлений (acceptance_status, accepted_by, accepted_at)...');
    await pool.query(`
      UPDATE ads
      SET acceptance_status = 'open', accepted_by = NULL, accepted_at = NULL
      WHERE accepted_by IS NOT NULL OR acceptance_status != 'open'
    `);
    console.log('✅ Объявления сброшены');

    // Удаляем все записи из ad_requests
    console.log('Удаляем все записи из ad_requests...');
    const result = await pool.query('DELETE FROM ad_requests');
    console.log(`✅ Удалено ${result.rowCount} записей`);

    console.log('🎉 Очистка завершена');
  } catch (err) {
    console.error('❌ Ошибка:', err);
  } finally {
    pool.end();
  }
}

clearAllDeals();