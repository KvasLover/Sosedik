// check_columns.js
const pool = require('./src/database'); // путь к вашему database.js

async function checkAndAddColumns() {
  try {
    // deposit
    const depositCheck = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'ads' AND column_name = 'deposit'
    `);
    if (depositCheck.rows.length === 0) {
      await pool.query('ALTER TABLE ads ADD COLUMN deposit INTEGER');
      console.log('✅ Колонка deposit добавлена');
    } else {
      console.log('ℹ️  Колонка deposit уже существует');
    }

    // value_category
    const valueCatCheck = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'ads' AND column_name = 'value_category'
    `);
    if (valueCatCheck.rows.length === 0) {
      await pool.query('ALTER TABLE ads ADD COLUMN value_category VARCHAR(20)');
      console.log('✅ Колонка value_category добавлена');
    } else {
      console.log('ℹ️  Колонка value_category уже существует');
    }

    // return_proposed_by
    const returnPropCheck = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'ad_requests' AND column_name = 'return_proposed_by'
    `);
    if (returnPropCheck.rows.length === 0) {
      await pool.query('ALTER TABLE ad_requests ADD COLUMN return_proposed_by INTEGER');
      console.log('✅ Колонка return_proposed_by добавлена');
    } else {
      console.log('ℹ️  Колонка return_proposed_by уже существует');
    }

    // return_proposed_condition
    const returnCondCheck = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'ad_requests' AND column_name = 'return_proposed_condition'
    `);
    if (returnCondCheck.rows.length === 0) {
      await pool.query('ALTER TABLE ad_requests ADD COLUMN return_proposed_condition TEXT');
      console.log('✅ Колонка return_proposed_condition добавлена');
    } else {
      console.log('ℹ️  Колонка return_proposed_condition уже существует');
    }

    console.log('Готово.');
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  } finally {
    pool.end();
  }
}

checkAndAddColumns();