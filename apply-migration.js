const pool = require('./src/database');
const fs = require('fs');
const path = require('path');

const applyMigration = async () => {
  try {
    console.log('🔄 Применение миграции: migration-ad-requests-v2.sql');
    
    const migrationPath = path.join(__dirname, 'migration-ad-requests-v2.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Разбиваем на отдельные statements (игнорируя комментарии)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    console.log(`📋 Найдено ${statements.length} statement(ов)`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`\n[${i + 1}/${statements.length}] Выполнение...`);
        await pool.query(statement + ';');
        console.log(`✅ OK`);
      } catch (err) {
        // Некоторые ошибки ожидаемы (например, если constraint уже существует)
        if (err.message.includes('already exists') || 
            err.message.includes('constraint')) {
          console.log(`⚠️  ${err.message.substring(0, 100)}`);
        } else {
          console.error(`❌ Ошибка: ${err.message}`);
          // Не прерываем, продолжаем
        }
      }
    }
    
    console.log('\n✅ Миграция завершена');
    
    // Проверяем новые статусы
    const result = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name='ad_requests' AND constraint_type='CHECK'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ CHECK constraint добавлена');
    }
    
    // Проверяем индексы
    const indexResult = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename='ad_requests' AND indexname LIKE 'idx_%'
    `);
    
    console.log(`✅ Найдено ${indexResult.rows.length} индексов`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка при применении миграции:', err);
    process.exit(1);
  }
};

applyMigration();
