const pool = require('./src/database');

async function createChatTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Таблица chat_messages создана или уже существует');
  } catch (err) {
    console.error('Ошибка создания таблицы chat_messages:', err);
  } finally {
    await pool.end();
  }
}

createChatTable();