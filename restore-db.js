const fs = require('fs');
const path = require('path');
const pool = require('./src/database');
require('dotenv').config();

async function restoreBackup(backupFile) {
  try {
    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Файл не найден: ${backupFile}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(backupFile, 'utf-8');
    console.log(`🔄 Восстанавливаем из ${backupFile}...`);
    
    // Разбиваем SQL на отдельные команды
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));
    
    console.log(`📝 Всего команд: ${commands.length}`);
    
    for (let i = 0; i < commands.length; i++) {
      try {
        await pool.query(commands[i]);
        console.log(`✓ Выполнено ${i + 1}/${commands.length}`);
      } catch (err) {
        console.error(`❌ Ошибка на команде ${i + 1}:`, err.message);
        throw err;
      }
    }
    
    console.log(`\n✅ Восстановление завершено успешно!`);
    await pool.end();
  } catch (err) {
    console.error('❌ Ошибка при восстановлении:', err);
    process.exit(1);
  }
}

const backupFile = process.argv[2];
if (!backupFile) {
  console.error('❌ Укажите файл резервной копии:\nnode restore-db.js <path-to-backup.sql>');
  process.exit(1);
}

restoreBackup(backupFile);
