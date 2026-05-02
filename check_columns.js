// check_columns.js
const pool = require('./src/database');

async function checkAndAddColumns() {
  const client = await pool.connect();
  try {
    // Проверка и добавление deposit
    const depositCheck = await client.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'ads' AND column_name = 'deposit'
    `);
    
    if (depositCheck.rows.length === 0) {
      await client.query('ALTER TABLE ads ADD COLUMN deposit INTEGER');
      console.log('✅ Колонка deposit добавлена');
    } else {
      console.log('ℹ️  Колонка deposit уже существует');
    }

    // Проверка и добавление value_category
    const valueCategoryCheck = await client.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'ads' AND column_name = 'value_category'
    `);
    
    if (valueCategoryCheck.rows.length === 0) {
      await client.query('ALTER TABLE ads ADD COLUMN value_category VARCHAR(20)');
      console.log('✅ Колонка value_category добавлена');
    } else {
      console.log('ℹ️  Колонка value_category уже существует');
    }

    console.log('Готово.');
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

checkAndAddColumns();