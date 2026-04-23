# PROJECT_STATE.md — Состояние приложения Sosedik

**Дата документирования:** 23 апреля 2026  
**Коммит:** `ads work improved` (df9dbd9)  
**Статус:** Активная разработка — основной функционал работает, требуется интеграция и доработка ряда компонентов

---

## 1. Общее описание проекта

### Назначение
**Sosedik** — веб-приложение для соседей в многоквартирном доме. Позволяет пользователям:
- Обмениваться объявлениями (предложение товаров/услуг или поиск)
- Брать предметы в аренду
- Обмениваться сообщениями
- Получать уведомления о взаимодействиях

### Основные пользовательские сценарии

**Базовый сценарий:**
1. User регистрируется по номеру телефона
2. Создает объявление (предложение или запрос)
3. Другие пользователи видят это объявление
4. Заинтересованные создают запрос на принятие
5. После согласия сторон общаются через чат
6. Подтверждают завершение сделки

**Сценарий аренды:**
1. Собственник создает предмет в разделе аренда
2. Другой пользователь запрашивает сдать в аренду
3. Происходит согласование и передача

**Сценарий сообщений:**
- Users общаются через приватные сообщения (в контексте выполненной сделки или напрямую)

---

## 2. Архитектура

### Технологический стек

**Backend:**
- **Node.js** с фреймворком **Express.js** (версия 4.18.2)
- **PostgreSQL** — база данных (драйвер `pg` версия 8.11.0)
- **JWT** (`jsonwebtoken` 9.0.0) — токен-основанная аутентификация
- **bcryptjs** (2.4.3) — хеширование паролей
- **dotenv** (16.0.3) — управление переменными окружения
- **nodemon** (2.0.22) — автоперезагрузка в режиме разработки

**Frontend:**
- **Vanilla JavaScript** (без фреймворков)
- **HTML5 + CSS3**
- **Fetch API** для REST запросов к серверу
- **localStorage** для хранения JWT токена

**База данных:**
- **PostgreSQL** с пулингом соединений (`pg.Pool`)
- Максимум соединений: 20 (конфигурация по умолчанию)

### Общая схема взаимодействия

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (public/)                          │
│  ├─ HTML страницы (index, login, ads, profile, chats, etc.)    │
│  ├─ JavaScript (app.js, header_new.js)                          │
│  └─ CSS (styles.css)                                            │
│                         ↕ (Fetch REST API)                      │
├─────────────────────────────────────────────────────────────────┤
│                   Backend (src/server.js)                        │
│  Express сервер на порту 3000                                  │
│  ├─ Middleware: auth (JWT verification)                         │
│  ├─ Routes: /api/auth, /api/ads, /api/users, /api/messages    │
│  │          /api/rentals, /api/favorites, /api/notifications   │
│  └─ Models: User, Ad, Rental, Message, Notification, Favorite  │
│                         ↕ (SQL queries)                         │
├─────────────────────────────────────────────────────────────────┤
│            PostgreSQL Database (db/schema.sql)                  │
│  ├─ users, ads, rentals, messages, notifications               │
│  ├─ ad_requests, rental_requests, favorites, moderation        │
│  └─ Миграции в migration-*.sql файлах                          │
└─────────────────────────────────────────────────────────────────┘
```

### Способы взаимодействия

**Аутентификация:**
- JWT токен (срок действия: 7 дней)
- Передается в заголовке: `Authorization: Bearer <token>`
- Проверяется middleware перед защищенными эндпоинтами

**Авторизация:**
- Уровни пользователей: 0 (guest), 1 (registered), 2 (verified), 3 (moderator), 4 (admin)
- Проверка `level` перед критичными операциями (создание объявлений требует level ≥ 1)

**Данные:**
- Формат: JSON
- Все запросы с телом используют `Content-Type: application/json`
- Ошибки возвращаются с HTTP статусом и сообщением в JSON

---

## 3. Структура проекта

```
Sosedik/
├── README.md                          # Основная документация
├── package.json                       # npm зависимости, точка входа (src/server.js)
├── .env                              # Переменные окружения (БД, JWT_SECRET, PORT)
├── migration-ads-system.sql          # Миграция: система запросов на объявления
├── migration-notifications.sql       # Миграция: таблица уведомлений с индексами
│
├── src/                              # Backend код
│   ├── server.js                     # Инициализация Express, routes setup
│   ├── database.js                   # Подключение PostgreSQL (pg.Pool)
│   ├── middleware/
│   │   └── auth.js                   # JWT verification middleware
│   ├── models/                       # Business logic и DB queries
│   │   ├── User.js                   # CRUD для users, уровни, баллы
│   │   ├── Ad.js                     # CRUD для ads + система запросов (ad_requests)
│   │   ├── Message.js                # Отправка/получение сообщений
│   │   ├── Notification.js           # CRUD для notifications
│   │   ├── Rental.js                 # Управление аренда предметов
│   │   └── Favorite.js               # Добавление/удаление из избранного
│   └── routes/                       # API endpoints
│       ├── auth.js                   # POST /register, /login
│       ├── users.js                  # GET /me, PUT /me, GET /:id, POST /:id/points
│       ├── ads.js                    # CRUD объявлений + запросы на принятие
│       ├── messages.js               # Отправка/получение сообщений
│       ├── rentals.js                # CRUD для аренды
│       ├── favorites.js              # Add/remove/list из избранного
│       └── notifications.js          # Get/read/delete уведомлений
│
├── db/
│   └── schema.sql                    # Начальная схема БД (users, ads, rentals, messages, etc.)
│
├── public/                           # Frontend
│   ├── index.html                    # Главная страница
│   ├── login.html                    # Страница входа и регистрации
│   ├── ads.html                      # Просмотр объявлений, создание
│   ├── ad-details.html               # Детали объявления
│   ├── profile.html                  # Профиль пользователя с табами
│   ├── chats.html                    # Список чатов
│   ├── chat.html                     # Диалог с партнером
│   ├── rentals.html                  # Список предметов в аренде
│   ├── rental-details.html           # Детали аренды
│   ├── notifications.html            # Список уведомлений
│   ├── css/
│   │   └── styles.css                # Единый стилевой лист
│   └── js/
│       ├── app.js                    # Основная фронтенд логика
│       └── header_new.js             # Компонент навигационного меню
│
├── assets/
│   └── reputation.txt                # (содержимое не найдено в коде)
│
├── Аватарки/                         # Тестовые аватарки пользователей
└── Инструменты/                      # (неиспользуемая папка)

```

### Назначение ключевых модулей

| Модуль | Назначение | Зависит от |
|--------|-----------|-----------|
| `src/server.js` | Инициализация Express, PORT, логирование | database.js, routes/* |
| `src/database.js` | Подключение PostgreSQL, пулинг соединений | .env |
| `src/middleware/auth.js` | Проверка JWT в заголовке Authorization | .env (JWT_SECRET) |
| `src/models/Ad.js` | Вся логика объявлений: CRUD, запросы, архивирование | database.js |
| `src/models/User.js` | Работа с пользователями: профиль, уровни, баллы | database.js |
| `src/routes/ads.js` | API эндпоинты для объявлений (GET /api/ads, POST, etc.) | models/Ad.js, middleware/auth.js |
| `public/js/app.js` | Фронтенд логика: загрузка данных, обработчики форм | localStorage, fetch API |
| `public/js/header_new.js` | Компонент хедера со ссылками и юзер меню | checkAuth() из app.js |

---

## 4. Модель данных

### Таблица `users`

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  level INTEGER DEFAULT 0,
    -- 0: guest (не зарегистрирован)
    -- 1: registered (прошел регистрацию)
    -- 2: verified (прошел верификацию, не используется)
    -- 3: moderator (модератор, не используется)
    -- 4: admin (администратор, используется для проверки прав)
  name VARCHAR(100),
  apartment VARCHAR(50),
  show_apartment BOOLEAN DEFAULT FALSE,
  verification_photo TEXT,  -- URL или путь к фото (поле не используется)
  points INTEGER DEFAULT 0,  -- Баллы репутации (поле создано, логика не реализована)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Индексы:** PRIMARY KEY на `id`, UNIQUE на `phone`

### Таблица `ads`

```sql
CREATE TABLE ads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20),  -- 'offer' (предложение) или 'request' (запрос)
  category VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  urgency BOOLEAN DEFAULT FALSE,
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,  -- мягкое удаление
  accepted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- кто принял
  accepted_at TIMESTAMP,
  
  -- Добавлено миграцией migration-ads-system.sql
  price NUMERIC,
  contact VARCHAR(255),
  acceptance_status VARCHAR(20) DEFAULT 'open',  -- 'open', 'accepted', 'completed'
  expires_at TIMESTAMP
)
```

**Индексы:** PRIMARY KEY, FK на `user_id`, FK на `accepted_by`

### Таблица `ad_requests`

```sql
CREATE TABLE ad_requests (
  id SERIAL PRIMARY KEY,
  ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
    -- 'pending': ждет решения автора
    -- 'accepted': принят автором
    -- 'declined': отклонен автором
    -- 'completed': обе стороны подтвердили завершение
  message TEXT,  -- сообщение при создании запроса
  decline_reason TEXT,  -- причина отклонения (заполняется при отклонении)
  chat_id INTEGER REFERENCES chats(id),  -- связь с чатом (если существует)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  requester_confirmed BOOLEAN DEFAULT FALSE,  -- запросивший подтвердил завершение
  creator_confirmed BOOLEAN DEFAULT FALSE,  -- автор подтвердил завершение
  completed_at TIMESTAMP,
  
  UNIQUE(ad_id, requester_id)  -- один запрос на объявление от пользователя
)
```

**Индексы:** PRIMARY KEY, FK, UNIQUE(ad_id, requester_id), idx_ad_requests_ad_id, idx_ad_requests_requester_id, idx_ad_requests_status

**Триггер:** `update_ad_requests_updated_at` — автоматически обновляет `updated_at` при любом UPDATE

### Таблица `rentals`

```sql
CREATE TABLE rentals (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  photos TEXT[],  -- массив URLs к фотографиям
  rental_terms TEXT,  -- условия аренды (текст)
  value_category VARCHAR(50),  -- 'low', 'medium', 'high' - стоимость предмета
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Таблица `rental_requests`

```sql
CREATE TABLE rental_requests (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER NOT NULL REFERENCES rentals(id),
  requester_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
    -- 'pending': ждет решения собственника
    -- 'approved': собственник одобрил
    -- 'completed': завершено
  checklist_before TEXT,  -- чек-лист до передачи
  checklist_after TEXT,  -- чек-лист после возврата
  contract_url TEXT,  -- ссылка на контракт/соглашение
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Таблица `messages` (она же `chat_messages`)

```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

⚠️ **ПРОБЛЕМА:** В коде `Message.js` ищет таблицу `chat_messages`, а `schema.sql` создает `messages`. Это вызовет ошибку!

### Таблица `notifications`

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50),  -- 'message', 'ad_request', 'rental_request', 'system'
  title VARCHAR(255),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_id INTEGER,  -- ID связанного объекта (ad_id, message_id, etc.)
  related_type VARCHAR(50),  -- тип связанного объекта
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Индексы:** idx_notifications_user_id, idx_notifications_is_read, idx_notifications_created_at DESC

### Таблица `favorites`

```sql
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL,  -- 'ad' или 'rental'
  item_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, item_type, item_id)
)
```

### Таблица `moderation`

```sql
CREATE TABLE moderation (
  id SERIAL PRIMARY KEY,
  reported_by INTEGER NOT NULL REFERENCES users(id),
  reported_user INTEGER NOT NULL REFERENCES users(id),
  issue_type VARCHAR(100),  -- категория жалобы
  description TEXT,
  status VARCHAR(20) DEFAULT 'open',  -- 'open', 'resolved', 'escalated'
  moderator_id INTEGER REFERENCES users(id),
  resolution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Статус:** Таблица создана, но API и логика не реализованы

### Отношения между таблицами

```
users ─┬─→ ads (user_id)
       ├─→ ad_requests (requester_id, creator через ads → users)
       ├─→ rentals (owner_id)
       ├─→ rental_requests (requester_id)
       ├─→ messages (sender_id, receiver_id)
       ├─→ notifications (user_id)
       ├─→ favorites (user_id)
       └─→ moderation (reported_by, reported_user, moderator_id)

ads ────→ ad_requests (ad_id) [каскадное удаление]
        → users (accepted_by)

rentals ─→ rental_requests (rental_id)
         → users (owner_id)

messages ─ связи двусторонние (sender_id ↔ receiver_id)
```

---

## 5. Реализованный функционал

### 5.1 Пользователи (Users)

**✅ РЕАЛИЗОВАНО:**
- **Регистрация:**
  - Номер телефона + пароль
  - Проверка уникальности телефона
  - Хеширование пароля (bcryptjs, salt=10)
  - Автоматическое присвоение `level = 1` (registered)
  - Возврат JWT токена
  
- **Вход (Login):**
  - По номеру телефона + пароль
  - Проверка пароля
  - Выдача JWT токена (срок: 7 дней = 604800 сек)
  - Возврат информации о пользователе

- **Профиль:**
  - `GET /api/users/me` — полная информация о текущем пользователе (все поля)
  - `PUT /api/users/me` — обновление: name, apartment, show_apartment
  - `GET /api/users/:id` — публичный профиль (только: id, name, level, points, apartment)

- **Удаление аккаунта:**
  - `DELETE /api/users/me`
  - Каскадное удаление всех связанных данных (объявления, сообщения, избранное)

- **Баллы и уровни:**
  - Уровни хранятся: 0 (guest), 1 (registered), 2 (verified), 3 (moderator), 4 (admin)
  - `level >= 1` требуется для создания объявлений
  - `level = 4` требуется для добавления баллов другим (`POST /api/users/:id/points`)
  - Баллы хранятся в `points` поле
  - ⚠️ Логика начисления баллов не реализована

**❌ НЕ РЕАЛИЗОВАНО:**
- Верификация (поле `verification_photo` создано, но логики нет)
- Автоматическое присвоение `level 2` после верификации
- Загрузка фото верификации
- Использование уровней 2 и 3
- Автоматическое начисление баллов за действия

### 5.2 Объявления (Ads)

**✅ РЕАЛИЗОВАНО:**

- **Просмотр объявлений:**
  - `GET /api/ads` — все активные объявления (public)
  - Фильтрация по: `category`, `type` (offer/request)
  - Возвращает: id, user_id, category, title, price, contact, created_at, author_name, acceptor_name
  
- **Создание объявления:**
  - `POST /api/ads` (требует auth, level ≥ 1)
  - Поля: category, title, description, price, contact
  - Автоматически: user_id, active=true, created_at
  - Отправляет сообщение об ошибке если не authorized
  
- **Редактирование:**
  - `PUT /api/ads/:id` (требует auth, только автор)
  - Возможно обновить: title, description, category, location
  
- **Удаление:**
  - `DELETE /api/ads/:id` (требует auth, только автор)
  - Мягкое удаление: `active = false`
  
- **Просмотр моих объявлений:**
  - `GET /api/ads/my` (требует auth)
  - Возвращает все объявления текущего пользователя
  
- **Просмотр деталей:**
  - `GET /api/ads/:id` (public)
  - Полная информация + имя автора
  
- **Старые объявления (архивирование):**
  - Функция `Ad.archiveOldAds(daysOld = 60)` существует
  - ❌ Но не вызывается автоматически (нет крон-джоба)

**Система запросов на объявления:**

- **Создание запроса:**
  - `POST /api/ads/:id/request` (требует auth, не автор)
  - Тело: `{ message }`
  - Проверяет: не автор ли, нет ли уже pending/accepted запроса
  - Создает запись в `ad_requests` (status = 'pending')
  - UNIQUE(ad_id, requester_id) — один запрос на объявление
  
- **Просмотр запросов:**
  - `GET /api/ads/requests/incoming` (требует auth) — входящие запросы (для автора объявлений)
  - `GET /api/ads/requests/outgoing` (требует auth) — исходящие запросы (от текущего пользователя)
  - `GET /api/ads/requests/active` (требует auth) — активные запросы (accepted)
  
- **Принятие запроса:**
  - `POST /api/ads/requests/:requestId/accept` (требует auth, только автор объявления)
  - Меняет: status = 'accepted', updated_at = NOW()
  
- **Отклонение запроса:**
  - `POST /api/ads/requests/:requestId/decline` (требует auth, только автор)
  - Тело: `{ reason }`
  - Меняет: status = 'declined', decline_reason, updated_at
  
- **Подтверждение выполнения:**
  - `POST /api/ads/requests/:requestId/confirm` (требует auth, обе стороны)
  - Тело: `{ isRequester: boolean }`
  - Устанавливает: requester_confirmed или creator_confirmed = true
  - Когда обе = true → status = 'completed', completed_at = NOW()
  
- **Отмена запроса:**
  - `DELETE /api/ads/requests/:requestId/cancel` (требует auth, только запросивший, только если status='pending')
  - Удаляет запись
  
- **Удаление отклоненного запроса:**
  - `DELETE /api/ads/requests/:requestId/delete` (требует auth)
  - Обе стороны могут удалить отклоненный запрос
  
- **Старый функционал (может не работать):**
  - `POST /api/ads/:id/accept` — прямое принятие объявления (без запроса)
  - `DELETE /api/ads/:id/accept` — отмена принятия

**⚠️ ОГРАНИЧЕНИЯ:**
- Нет проверки дублирования запросов (кроме UNIQUE constraint)
- Нет автоматического архивирования старых объявлений
- Нет уведомлений о новых запросах (структура есть, интеграции нет)

### 5.3 Сообщения (Messages / Chat)

**✅ РЕАЛИЗОВАНО:**

- **Отправка сообщения:**
  - `POST /api/messages` (требует auth)
  - Тело: `{ receiverId, content }`
  - Создает запись в `messages` (sender_id, receiver_id, content, created_at)
  
- **Получение переписки:**
  - `GET /api/messages?with=partnerId` (требует auth)
  - Возвращает вся история сообщений между двумя пользователями
  - Включает информацию о партнере (id, name, photo)
  
- **Список чатов (партнеры):**
  - `GET /api/messages/conversations` (требует auth)
  - Возвращает список всех уникальных партнеров
  - Последнее сообщение и время: lastMessage, lastTime
  
**❌ НЕ РЕАЛИЗОВАНО:**
- Real-time сообщения (WebSocket) — только HTTP polling
- Индикаторы "печатает..."
- Чтение сообщений (is_read)
- Удаление сообщений
- Редактирование сообщений

**⚠️ ПРОБЛЕМА В КОДЕ:**
- `Message.js` ищет таблицу `chat_messages`, но `schema.sql` создает таблицу `messages`
- Это вызовет ошибку: "relation 'chat_messages' does not exist"

### 5.4 Аренда (Rentals)

**✅ РЕАЛИЗОВАНО:**

- **Просмотр предметов в аренде:**
  - `GET /api/rentals` (public)
  - Фильтрация по: `category`
  - Возвращает: все активные предметы
  
- **Создание аренды:**
  - `POST /api/rentals` (требует auth, level ≥ 1)
  - Тело: `{ itemName, category, photos, rentalTerms, valueCategory }`
  - Где `valueCategory`: 'low', 'medium', 'high'
  
- **Просмотр моей аренды:**
  - `GET /api/rentals/my` (требует auth)
  
- **Просмотр деталей:**
  - `GET /api/rentals/:id` (public)
  
- **Удаление:**
  - `DELETE /api/rentals/:id` (требует auth, только владелец)

**⚠️ ЧАСТИЧНО РЕАЛИЗОВАНО:**
- Таблица `rental_requests` создана, но:
  - ❌ Нет API endpoint'ов для работы с запросами аренды
  - ❌ Нет логики в `Rental.js` для создания/управления запросами
  - ❌ Фронтенд не отправляет запросы аренды

### 5.5 Избранное (Favorites)

**✅ РЕАЛИЗОВАНО:**

- **Добавить в избранное:**
  - `POST /api/favorites` (требует auth)
  - Тело: `{ itemType: 'ad'|'rental', itemId }`
  - UNIQUE(user_id, item_type, item_id) — нельзя добавить дважды
  
- **Удалить из избранного:**
  - `DELETE /api/favorites/:itemType/:itemId` (требует auth)
  
- **Получить избранное:**
  - `GET /api/favorites?itemType=X` (требует auth)
  - Возвращает объекты с полными данными (JOIN с ads/rentals таблицами)
  
- **Очистить избранное:**
  - `DELETE /api/favorites/all` (требует auth)

### 5.6 Уведомления (Notifications)

**✅ РЕАЛИЗОВАНО:**

- **Получить уведомления:**
  - `GET /api/notifications?limit=50&offset=0` (требует auth)
  - С пагинацией
  - Возвращает: notifications[], unreadCount, pagination info
  
- **Счетчик непрочитанных:**
  - `GET /api/notifications/unread-count` (требует auth)
  - Возвращает кол-во непрочитанных
  
- **Отметить как прочитано:**
  - `PUT /api/notifications/:id/read` (требует auth)
  - `PUT /api/notifications/read-all` (требует auth) — сразу все
  
- **Удалить уведомление:**
  - `DELETE /api/notifications/:id` (требует auth)

**⚠️ ОГРАНИЧЕНИЯ:**
- ❌ Уведомления не создаются автоматически при действиях (запрос на объявление, сообщение, etc.)
- ❌ Таблица существует, методы существуют, но интеграция отсутствует
- Нет создания уведомлений через API (видимо, предполагается создание через фронтенд или триггеры БД)

### 5.7 Другое

- **Health Check:**
  - `GET /api/health` (public)
  - Проверка статуса: OK, connected to DB, текущее время

---

## 6. API Reference

### Базовая информация

**Base URL:** `http://localhost:3000/api`  
**Format:** JSON  
**Auth:** Bearer Token в заголовке `Authorization: Bearer <token>`

### Структура ответов

**Успешный ответ:**
```json
{
  "message": "Действие успешно",
  "user": { ... }   // или data, ad, list и т.д.
}
```

**Ошибка:**
```json
{
  "error": "Сообщение об ошибке"
}
```

### Все endpoint'ы (сводная таблица)

| Метод | Path | Требует Auth | Level | Описание |
|-------|------|--------|-------|----------|
| POST | /auth/register | Нет | - | Регистрация |
| POST | /auth/login | Нет | - | Вход |
| GET | /users/me | Да | 1+ | Мой профиль |
| PUT | /users/me | Да | 1+ | Обновить профиль |
| GET | /users/:id | Нет | - | Публичный профиль |
| POST | /users/:id/points | Да | 4 | Добавить баллы (admin) |
| DELETE | /users/me | Да | 1+ | Удалить аккаунт |
| GET | /ads | Нет | - | Все объявления |
| GET | /ads/:id | Нет | - | Детали объявления |
| GET | /ads/my | Да | 1+ | Мои объявления |
| POST | /ads | Да | 1+ | Создать объявление |
| PUT | /ads/:id | Да | - | Редактировать (только автор) |
| DELETE | /ads/:id | Да | - | Удалить (только автор) |
| POST | /ads/:id/request | Да | 1+ | Создать запрос |
| GET | /ads/requests/incoming | Да | - | Входящие запросы |
| GET | /ads/requests/outgoing | Да | - | Исходящие запросы |
| GET | /ads/requests/active | Да | - | Активные запросы |
| POST | /ads/requests/:id/accept | Да | - | Принять запрос (автор) |
| POST | /ads/requests/:id/decline | Да | - | Отклонить (автор) |
| POST | /ads/requests/:id/confirm | Да | - | Подтвердить завершение |
| DELETE | /ads/requests/:id/cancel | Да | - | Отменить (requester, pending only) |
| DELETE | /ads/requests/:id/delete | Да | - | Удалить отклоненный |
| GET | /rentals | Нет | - | Все аренды |
| GET | /rentals/:id | Нет | - | Детали аренды |
| GET | /rentals/my | Да | - | Мои аренды |
| POST | /rentals | Да | 1+ | Создать аренду |
| DELETE | /rentals/:id | Да | - | Удалить (владелец) |
| GET | /messages | Да | - | История с партнером (?with=id) |
| GET | /messages/conversations | Да | - | Список чатов |
| POST | /messages | Да | - | Отправить сообщение |
| GET | /favorites | Да | - | Избранное |
| POST | /favorites | Да | - | Добавить в избранное |
| DELETE | /favorites/:type/:id | Да | - | Удалить из избранного |
| DELETE | /favorites/all | Да | - | Очистить все |
| GET | /notifications | Да | - | Список уведомлений |
| GET | /notifications/unread-count | Да | - | Кол-во непрочитанных |
| PUT | /notifications/:id/read | Да | - | Отметить прочитано |
| PUT | /notifications/read-all | Да | - | Все прочитано |
| DELETE | /notifications/:id | Да | - | Удалить |
| GET | /health | Нет | - | Проверка статуса |

---

## 7. Потоки данных (реальные)

### Поток 1: Регистрация и первый вход

```
1. User открывает /login.html
2. Вводит phone + password, кликает "Зарегистрироваться"
3. JavaScript вызывает: register(phone, password)
4. Fetch: POST /api/auth/register { phone, password }
5. Backend:
   - Проверяет UNIQUE(phone)
   - Хеширует пароль: bcryptjs.hash(password, 10)
   - INSERT в users: (phone, password_hash, level=1, created_at=NOW)
   - Генерирует JWT: sign({id, phone, level}, JWT_SECRET, {expiresIn: '7d'})
   - Возвращает: { message, user: {...}, token }
6. Frontend:
   - localStorage.sosedik_token = token
   - Вызывает checkAuth()
   - checkAuth() показывает user content, скрывает guest content
   - Редирект на / (index.html)
```

### Поток 2: Создание объявления

```
1. User на /ads.html кликает "+ Создать объявление"
2. Заполняет форму: категория, название, описание, цена, контакт
3. Кликает "Опубликовать"
4. JavaScript вызывает: createAd(category, title, description, price, contact)
5. Fetch: POST /api/ads
   Headers: { Authorization: Bearer <token> }
   Body: { category, title, description, price, contact }
6. Backend middleware:
   - verifyToken() извлекает id из JWT
   - checkLevel(1) проверяет level >= 1
7. Backend логика:
   - Ad.createAd(user_id, ...)
   - INSERT в ads: (user_id, category, title, ..., active=true, created_at=NOW)
   - Возвращает: { message, ad: {...} }
8. Frontend:
   - Очищает форму
   - Показывает уведомление об успехе
   - Перезагружает список объявлений (loadAds())
```

### Поток 3: Система запросов на объявления (полная)

```
ЭТАП 1: Просмотр и создание запроса
═════════════════════════════════════
1. User видит объявление на /ads.html
2. Нажимает "Создать запрос"
3. Вводит сообщение (опционально)
4. Fetch: POST /api/ads/:adId/request { message }
5. Backend:
   - Проверяет: requester_id != author_id
   - Проверяет UNIQUE(ad_id, requester_id) и status != ('pending'|'accepted')
   - INSERT в ad_requests: (ad_id, requester_id, status='pending', message, created_at=NOW)
   - Возвращает: { message, request: {...} }
6. Frontend уведомляет об успехе

ЭТАП 2: Автор видит входящие запросы
═════════════════════════════════════
1. Author на /profile.html вкладка "Входящие запросы"
2. Fetch: GET /api/ads/requests/incoming
3. Backend: SELECT * FROM ad_requests WHERE ad_id IN (мои объявления)
4. Отображает список: requesters + status + message

ЭТАП 3: Принятие или отклонение
═════════════════════════════════
A) ПРИНЯТИЕ:
   - Author кликает "Принять" на запросе
   - Fetch: POST /api/ads/requests/:requestId/accept
   - Backend: UPDATE ad_requests SET status='accepted', updated_at=NOW WHERE id=requestId
   - Оба вида (author и requester) видят статус "accepted"

B) ОТКЛОНЕНИЕ:
   - Author кликает "Отклонить" + вводит причину
   - Fetch: POST /api/ads/requests/:requestId/decline { reason }
   - Backend: UPDATE SET status='declined', decline_reason=reason
   - Requester видит отклонение и причину

ЭТАП 4: Подтверждение завершения (для accepted запросов)
═══════════════════════════════════════════════════════════
1. Requester выполнил сделку, кликает "Подтвердить выполнение"
2. Fetch: POST /api/ads/requests/:requestId/confirm { isRequester: true }
3. Backend: UPDATE ad_requests SET requester_confirmed=true WHERE id
4. Author видит, что requester подтвердил, тоже кликает
5. Fetch: POST /api/ads/requests/:requestId/confirm { isRequester: false }
6. Backend проверяет: if requester_confirmed && creator_confirmed:
   UPDATE SET status='completed', completed_at=NOW
7. Запрос переходит в "Завершено"

АЛЬТЕРНАТИВА: ОТМЕНА ИЛИ УДАЛЕНИЕ
═══════════════════════════════════
- Requester (только на pending): DELETE /api/ads/requests/:requestId/cancel
- Любой (только на declined): DELETE /api/ads/requests/:requestId/delete
```

### Поток 4: Чат между двумя пользователями

```
1. User A открывает /chats.html
2. Fetch: GET /api/messages/conversations
3. Backend: SELECT DISTINCT MIN(sender_id, receiver_id), MAX(...) 
           и последнее сообщение, время
4. Отображает список чатов с именами партнеров

5. User A кликает на Partner B
6. Переходит на /chat.html?with=partnerId
7. Fetch: GET /api/messages?with=partnerId
8. Backend: SELECT * FROM messages 
           WHERE (sender=me AND receiver=partner) OR (sender=partner AND receiver=me)
           ORDER BY created_at
9. Отображает историю сообщений

10. User A вводит текст, нажимает "Отправить"
11. Fetch: POST /api/messages { receiverId: partnerId, content }
12. Backend: INSERT INTO messages (sender_id, receiver_id, content, created_at)
13. Frontend перезагружает сообщения (простой полинг, не real-time)
```

### Поток 5: Избранное

```
1. User видит объявление, кликает на сердечко "В избранное"
2. Fetch: POST /api/favorites { itemType: 'ad', itemId }
3. Backend: 
   - Проверяет UNIQUE(user_id, itemType, itemId)
   - INSERT INTO favorites (user_id, 'ad', itemId, created_at)
   - Возвращает: { message, favorite: {...} }
4. Frontend обновляет визуальное состояние (сердечко становится заполненным)

5. На /profile.html вкладка "Избранное"
6. Fetch: GET /api/favorites?itemType=ad
7. Backend: 
   - SELECT * FROM favorites WHERE user_id=me AND item_type='ad'
   - LEFT JOIN ads ON favorites.item_id = ads.id
   - Возвращает полные объекты с данными из ads
8. Отображает карточки избранных объявлений
```

---

## 8. Частично реализованный функционал

### 1. Уведомления
- **Статус:** Таблица + API созданы, но интеграция отсутствует
- **Что работает:**
  - CRUD операции (`GET, PUT, DELETE /api/notifications/*`)
  - Пагинация
  - Счетчик непрочитанных
  
- **Что не работает:**
  - ❌ Автоматическое создание уведомлений при:
    - Новом сообщении
    - Новом запросе на объявление
    - Принятии/отклонении запроса
    - Запросе на аренду
  - ❌ Фронтенд не показывает уведомления (есть страница, но не вызывается)
  - ❌ Нет иконки с счетчиком в header

### 2. Аренда (Rental Requests)
- **Статус:** Структура БД есть, API отсутствует
- **Что создано:**
  - Таблица `rental_requests` с полями
  - Основные маршруты аренды (создание, удаление)
  
- **Что не работает:**
  - ❌ API для запроса аренды (создание, принятие, отклонение)
  - ❌ Логика в `Rental.js` для обработки запросов
  - ❌ Фронтенд не отправляет запросы
  - ❌ Чек-листы не используются

### 3. Верификация пользователей
- **Статус:** Поле в БД есть, логики нет
- **Что создано:**
  - `users.verification_photo` — VARCHAR для хранения ссылки
  - Уровень `level = 2` для верифицированных пользователей
  
- **Что не работает:**
  - ❌ API для загрузки фото верификации
  - ❌ Логика проверки (кто решает верифицирован ли юзер?)
  - ❌ Автоматическое присвоение level 2
  - ❌ Фронтенд для загрузки фото

### 4. Система репутации (Баллы)
- **Статус:** Поле в БД есть, логики нет
- **Что создано:**
  - `users.points` — INTEGER для хранения баллов
  - API `POST /api/users/:id/points` для добавления баллов (требует level 4)
  
- **Что не работает:**
  - ❌ Условия добавления баллов (за что дается балл?)
  - ❌ Автоматическое начисление при успешной сделке
  - ❌ Штрафы за отрицательные действия
  - ❌ Отображение и учет рейтинга на фронте

### 5. Архивирование старых объявлений
- **Статус:** Функция есть, но не вызывается
- **Код:**
  ```javascript
  Ad.archiveOldAds(daysOld = 60) {
    // Мягкое удаление: активные объявления старше 60 дней становятся inactive
  }
  ```
- **Проблема:** ❌ Нет крон-джоба или scheduler'а для периодического вызова

### 6. Модерация
- **Статус:** Только таблица, логики вообще нет
- **Что есть:**
  - Таблица `moderation` с полями: reported_by, reported_user, issue_type, description, status
  
- **Что не работает:**
  - ❌ API для отправки жалобы
  - ❌ Интерфейс модератора
  - ❌ Логика обработки жалоб
  - ❌ Автоматические действия (бан, предупреждение)

---

## 9. Неочевидные ограничения и технические долги

### 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

**1. Несоответствие имени таблицы messages**
- **Проблема:** `schema.sql` создает таблицу `messages`, но `Message.js` ищет `chat_messages`
- **Результат:** ❌ Все операции с сообщениями вызовут ошибку: "relation 'chat_messages' does not exist"
- **Решение:** Нужно либо переименовать таблицу, либо обновить код

**2. Отсутствие export методов в Model.js**
- **Проблема:** Маршруты вызывают методы, которые могут не быть экспортированы
- **Проверка:** Нужно убедиться, что все используемые методы в routes/* правильно экспортированы

### 🟡 ВЫСОКИЕ ПРИОРИТЕТЫ

**3. Нет валидации на backend**
```javascript
// Минимальные проверки:
- Длина пароля (может быть 1 символ!)
- Формат телефона (может быть что угодно)
- Пустые/null значения
- SQL injection (защита есть через parameterized queries, но проверять)
- XSS (нет санитизации HTML)
```

**4. Отсутствие HTTPS и security headers**
- Пароли передаются по HTTP
- JWT_SECRET может быть короткий
- Нет CORS конфигурации (может быть open to all)
- Нет rate limiting на login/register (brute force возможен)

**5. Нет автоматического создания уведомлений**
- Таблица создана, но триггеров БД нет
- Нет вызовов в маршрутах
- Результат: пользователи никогда не получат уведомления

**6. Frontend логика разбросана**
```javascript
// Много логики в inline обработчиках и глобальной области
// Нет модульности, нет SPA фреймворка
// Сложно расширять и поддерживать
// Нет управления состоянием
```

### 🟠 СРЕДНИЙ ПРИОРИТЕТ

**7. Система уровней не использована**
- level 2, 3, 4 созданы, но не применяются
- Нет проверок, что только admin может добавлять баллы

**8. Система баллов репутации не работает**
- Поле есть, но нет бизнес-логики
- Нет начисления за действия
- Нет отображения на фронте

**9. Архивирование объявлений не автоматизировано**
- Функция есть, но нет крон-джоба

**10. Отсутствует real-time чат**
- Только HTTP polling (неэффективно)
- Нет WebSocket

### 🟢 НИЗКИЙ ПРИОРИТЕТ

**11. Система модерации — только структура**
- Таблица создана, но нет логики

**12. Верификация пользователей — не реализована**
- Поле есть, но логики нет

**13. Requests аренды — в БД, но не в API**
- Таблица есть, но методы не реализованы

---

## 10. Используемые технологии и версии

### Backend (package.json)
- express: ^4.18.2
- pg: ^8.11.0
- jsonwebtoken: ^9.0.0
- bcryptjs: ^2.4.3
- dotenv: ^16.0.3
- nodemon: ^2.0.22 (devDependency)

### Frontend
- Vanilla JavaScript (ES6)
- HTML5, CSS3

### Database
- PostgreSQL 12+ (рекомендуется)

### Environment Variables (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sosedik_db
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secret_key (минимум 32 символа)
PORT=3000
```

---

## 11. Как запустить приложение

```bash
# 1. Установить зависимости
npm install

# 2. Создать базу данных PostgreSQL
createdb sosedik_db

# 3. Применить миграции (в порядке)
psql sosedik_db < db/schema.sql
psql sosedik_db < migration-ads-system.sql
psql sosedik_db < migration-notifications.sql

# 4. Настроить .env

# 5. Запустить сервер
npm start          # production
npm run dev        # development (с nodemon)

# 6. Открыть в браузере
http://localhost:3000
```

---

## 12. Заключение

**Приложение на текущий момент:**
- ✅ Имеет solid архитектуру БД
- ✅ Основной функционал работает (ads, messages, rentals базово)
- ✅ Система запросов на объявления полностью реализована
- ⚠️ Требует исправления критических ошибок (messages table)
- ⚠️ Требует интеграции уведомлений
- ⚠️ Требует security improvements
- ❌ Многие advanced функции только структурированы, но не реализованы

**Для production готовности необходимо:**
1. Исправить ошибку с таблицей messages/chat_messages
2. Реализовать валидацию и security
3. Интегрировать уведомления везде
4. Добавить real-time (WebSocket) или улучшить polling
5. Реализовать верификацию и систему баллов (если необходимо)
