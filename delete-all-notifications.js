const pool = require('./src/database');

async function deleteAllNotifications() {
  try {
    console.log('🗑️  Удаляем все уведомления...');
    
    const result = await pool.query('DELETE FROM notifications');
    
    console.log(`✅ Удалено ${result.rowCount} уведомлений`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

deleteAllNotifications();
