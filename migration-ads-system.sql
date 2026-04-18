-- Миграция: добавление недостающих полей в таблицу ads
-- и создание таблицы ad_requests для системы запросов

-- Добавляем недостающие поля в таблицу ads
ALTER TABLE ads ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS contact VARCHAR(255);
ALTER TABLE ads ADD COLUMN IF NOT EXISTS acceptance_status VARCHAR(20) DEFAULT 'open';
ALTER TABLE ads ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Создаем таблицу для запросов на принятие объявлений
CREATE TABLE IF NOT EXISTS ad_requests (
  id SERIAL PRIMARY KEY,
  ad_id INTEGER REFERENCES ads(id) ON DELETE CASCADE,
  requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, completed
  message TEXT, -- сообщение при запросе
  decline_reason TEXT, -- причина отклонения
  chat_id INTEGER REFERENCES chats(id), -- опциональный чат
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Подтверждения выполнения
  requester_confirmed BOOLEAN DEFAULT FALSE,
  creator_confirmed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,

  UNIQUE(ad_id, requester_id) -- один запрос на объявление от пользователя
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_ad_requests_ad_id ON ad_requests(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_requests_requester_id ON ad_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_ad_requests_status ON ad_requests(status);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ad_requests_updated_at
    BEFORE UPDATE ON ad_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();