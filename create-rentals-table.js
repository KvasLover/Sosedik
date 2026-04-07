const pool = require('./src/database');

async function createRentalsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rentals (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES users(id),
        item_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        photos TEXT[],
        rental_terms TEXT,
        value_category VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Таблица rentals создана или уже существует');
  } catch (err) {
    console.error('Ошибка создания таблицы rentals:', err);
  } finally {
    await pool.end();
  }
}

createRentalsTable();