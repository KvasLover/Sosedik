-- Миграция: создание таблицы уведомлений

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'message', 'ad_request', 'rental_request', 'system'
  title VARCHAR(255),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_id INTEGER, -- ID связанного объекта (сообщение, запрос и т.д.)
  related_type VARCHAR(50), -- тип связанного объекта
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Триггер для обновления created_at (если нужно)
-- Пока не требуется, так как created_at устанавливается автоматически