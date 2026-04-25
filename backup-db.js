const fs = require('fs');
const path = require('path');
const pool = require('./src/database');
require('dotenv').config();

const backupDir = 'db_backups';

// Создаем папку для резервных копий, если её нет
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function getAllTableNames() {
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  const result = await pool.query(query);
  return result.rows.map(row => row.table_name);
}

async function getTableSchema(tableName) {
  const query = `
    SELECT 
      'CREATE TABLE ' || '${tableName}' || ' (' || 
      array_to_string(
        array_agg(col_info ORDER BY ordinal_position),
        ', '
      ) || ');' as ddl
    FROM (
      SELECT
        ordinal_position,
        column_name || ' ' || 
        data_type || 
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END as col_info
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
    ) t;
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows[0]?.ddl || '';
  } catch (err) {
    console.error(`Error getting schema for ${tableName}:`, err);
    return '';
  }
}

async function getTableData(tableName) {
  const query = `SELECT * FROM "${tableName}";`;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error(`Error getting data for ${tableName}:`, err);
    return [];
  }
}

async function createBackup() {
  try {
    console.log('🔄 Начинаем создание резервной копии...');
    
    const timestamp = new Date().toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '');
    
    const backupFileName = `backup_${timestamp}.sql`;
    const backupPath = path.join(backupDir, backupFileName);
    
    let sql = `-- Резервная копия базы данных "Соседик"\n`;
    sql += `-- Создана: ${new Date().toLocaleString('ru-RU')}\n`;
    sql += `-- DATABASE_URL: ${process.env.DATABASE_URL}\n\n`;
    
    const tableNames = await getAllTableNames();
    console.log(`📊 Найдено таблиц: ${tableNames.length}`);
    
    // Добавляем DROP TABLE IF EXISTS для безопасного восстановления
    for (const tableName of tableNames) {
      sql += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;
    }
    sql += '\n';
    
    // Добавляем CREATE TABLE и INSERT statements
    for (const tableName of tableNames) {
      console.log(`📝 Обработка таблицы: ${tableName}`);
      
      // Добавляем схему таблицы
      const schema = await getTableSchema(tableName);
      if (schema) {
        sql += schema + '\n\n';
      }
      
      // Добавляем данные
      const data = await getTableData(tableName);
      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        sql += `-- Данные для таблицы "${tableName}"\n`;
        sql += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES\n`;
        
        sql += data.map(row => {
          const values = columns.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (typeof value === 'boolean') return value ? 'true' : 'false';
            if (value instanceof Date) return `'${value.toISOString()}'`;
            return value;
          }).join(', ');
          return `(${values})`;
        }).join(',\n');
        
        sql += ';\n\n';
      }
    }
    
    // Сохраняем файл
    fs.writeFileSync(backupPath, sql, 'utf-8');
    
    const fileSize = (fs.statSync(backupPath).size / 1024 / 1024).toFixed(2);
    console.log(`\n✅ Резервная копия успешно создана!`);
    console.log(`📁 Файл: ${backupPath}`);
    console.log(`📦 Размер: ${fileSize} МБ`);
    
    await pool.end();
  } catch (err) {
    console.error('❌ Ошибка при создании резервной копии:', err);
    process.exit(1);
  }
}

createBackup();
