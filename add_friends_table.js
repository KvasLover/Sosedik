// add_friends_table.js
const pool = require('./src/database');

async function addFriendsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, friend_id)
      );
    `);
    console.log('✅ Таблица friends создана или уже существует.');
  } catch (err) {
    console.error('❌ Ошибка при создании таблицы friends:', err.message);
  } finally {
    pool.end();
  }
}

addFriendsTable();