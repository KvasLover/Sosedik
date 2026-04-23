# Enhanced ad_requests Model - Implementation Guide

**Дата:** 23 апреля 2026  
**Версия:** v2.0  
**Статус:** Готово к применению

---

## 📋 Обзор изменений

Обновлена модель `ad_requests` для полного управления жизненным циклом взаимодействия между пользователями по объявлениям.

### Главные улучшения:

1. ✅ Расширенная система статусов (7 вместо 4)
2. ✅ Новый статус `in_progress` для выполнения работы
3. ✅ Отмена pending запросов теперь сохраняет историю (вместо удаления)
4. ✅ Автоматическое отклонение других pending запросов при принятии одного
5. ✅ Проверки на каждом переходе между статусами
6. ✅ Новый endpoint: `POST /api/ads/requests/:id/start`

---

## 🗄️ Миграция БД

**Файл:** `migration-ad-requests-v2.sql`

### Что изменяется:

```sql
-- Новые статусы (вместо 'declined' используется 'rejected')
pending     → ожидает решения автора
accepted    → выбран исполнителем (работа еще не начата)
rejected    → отклонен автором (новое имя вместо declined)
cancelled   → отменен запросившим (теперь сохраняется, не удаляется)
in_progress → стороны договорились и выполняют работу (НОВЫЙ)
completed   → обе стороны подтвердили выполнение
disputed    → есть конфликт между сторонами (для будущего использования)
```

### Как применить:

```bash
# Подключиться к БД
psql sosedik_db -U postgres

# Применить миграцию
\i migration-ad-requests-v2.sql

# Проверить результат
SELECT status, COUNT(*) FROM ad_requests GROUP BY status;
```

### Обратная совместимость:

- ✅ Все существующие `declined` записи будут переименованы в `rejected`
- ✅ Никакие данные не удаляются
- ✅ Индексы добавляются для оптимизации запросов

---

## 🔄 Переходы между статусами

### Диаграмма жизненного цикла

```
                  pending
                     │
       ┌─────────────┼─────────────┐
       │             │             │
    cancel      accept by       decline
    (requester) (author)        (author)
       │             │             │
       ▼             ▼             ▼
   cancelled      accepted      rejected ────────┐
                     │                           │
               start (either side)         delete if needed
                     │
                     ▼
               in_progress
                     │
         confirm (both sides)
                     │
                     ▼
                 completed


Optional: disputed status can be set by either party in case of conflict
```

### Описание переходов

| Переход | Кто может | Условия | Действие |
|---------|----------|---------|---------|
| **pending → accepted** | Автор объявления | Статус = pending | Все остальные pending на этот ad → rejected |
| **pending → rejected** | Автор объявления | Статус = pending | - |
| **pending → cancelled** | Запросивший | Статус = pending | Запись сохраняется с новым статусом |
| **accepted → in_progress** | Оба | Статус = accepted | Обновить ads.acceptance_status |
| **in_progress → completed** | Оба (обе стороны подтверждают) | Статус = in_progress | Когда оба подтвердили |

---

## 📝 Backend изменения

### 1. models/Ad.js

#### Новые/обновленные методы:

**`acceptAdRequest(requestId, userId)`**
```javascript
// Что изменилось:
// - Проверяет, что статус = 'pending'
// - Автоматически отклоняет все остальные pending запросы на этот ad
// - Устанавливает статус = 'accepted'
```

**`declineAdRequest(requestId, userId, reason)` (ранее decline)**
```javascript
// Что изменилось:
// - Проверяет, что статус = 'pending'
// - Устанавливает статус = 'rejected' (вместо 'declined')
```

**`startAdRequest(requestId, userId)` (НОВЫЙ)**
```javascript
// Новый метод!
// Переводит запрос из 'accepted' → 'in_progress'
// Может быть вызван автором или запросившим
// Обновляет ads.acceptance_status = 'in_progress'
```

**`confirmAdCompletion(requestId, userId, isRequester)`**
```javascript
// Что изменилось:
// - Теперь проверяет, что статус = 'in_progress' (не 'accepted')
// - При подтверждении обеих сторон: статус → 'completed'
```

**`cancelAdRequest(requestId, userId)`**
```javascript
// Что изменилось:
// - Вместо DELETE, делает UPDATE status = 'cancelled'
// - История сохраняется в БД
```

#### Методы без изменений (для совместимости):

- `getIncomingRequests()` — теперь включает 'rejected' вместо 'declined'
- `getOutgoingRequests()` — теперь включает 'rejected' вместо 'declined'
- `deleteDeclinedRequest()` — теперь удаляет 'rejected' (вместо 'declined')

---

### 2. routes/ads.js

#### Новый endpoint:

```
POST /api/ads/requests/:requestId/start
Authorization: Bearer <token>

Описание: Начать выполнение запроса (accepted → in_progress)
Требует: Статус = 'accepted'
Доступно: Автору объявления или запросившему

Ответ:
{
  "message": "Request started",
  "request": {
    "id": 123,
    "status": "in_progress",
    "updated_at": "2026-04-23T14:30:00Z",
    ...
  }
}

Ошибки:
- 400: Can only start accepted requests
- 403: Not authorized to start this request
- 404: Request not found
```

#### Обновленные endpoints:

**POST /api/ads/requests/:requestId/decline**
```javascript
// Что изменилось:
// - Добавлена проверка: Can only decline pending requests
// - Статус меняется на 'rejected'
```

**POST /api/ads/requests/:requestId/confirm**
```javascript
// Что изменилось:
// - Добавлена проверка: Can only confirm completion for in_progress requests
// - Работает только если статус = 'in_progress'
```

**DELETE /api/ads/requests/:requestId/cancel**
```javascript
// Что изменилось:
// - Теперь меняет статус на 'cancelled' (вместо DELETE)
// - Запись остается в БД
```

**DELETE /api/ads/requests/:requestId/delete**
```javascript
// Что изменилось:
// - Удаляет только 'rejected' запросы (вместо 'declined')
```

---

## 🔐 Проверки и ограничения

### Реализовано:

✅ **Только один active request per ad**
- При принятии одного запроса, все остальные pending → rejected
- Максимум один `accepted` или `in_progress` на объявление

✅ **Переходы между статусами валидируются**
- Нельзя принять уже accepted запрос
- Нельзя начать (start), если не accepted
- Нельзя завершить, если не in_progress
- Нельзя отменить non-pending запрос

✅ **Права доступа проверяются**
- Только автор может accept/decline pending
- Только запросивший может cancel pending
- Только обе стороны могут confirm в in_progress
- Только обе стороны могут delete rejected

### В TODO (для будущих версий):

- [ ] Система disputes (конфликты)
- [ ] Автоматическое создание уведомлений при переходе статуса
- [ ] История всех переходов статусов (аудит trail)
- [ ] Механизм разрешения спорных ситуаций

---

## 🧪 Примеры использования API

### Полный цикл взаимодействия:

```bash
# 1. REQUESTER создает запрос на объявление
POST /api/ads/:adId/request
{
  "message": "Интересует ваше объявление. Готов начать завтра."
}
→ ad_requests.status = 'pending'

# 2. AUTHOR просмотрит входящие запросы
GET /api/ads/requests/incoming
→ Видит запросы со статусом 'pending' и 'rejected'

# 3. AUTHOR принимает запрос (все остальные pending → rejected)
POST /api/ads/requests/:requestId/accept
→ ad_requests.status = 'accepted'
→ Остальные pending на этот ad → 'rejected'

# 4. Либо REQUESTER, либо AUTHOR начинают работу
POST /api/ads/requests/:requestId/start
→ ad_requests.status = 'in_progress'

# 5. REQUESTER подтверждает готовность
POST /api/ads/requests/:requestId/confirm
{
  "isRequester": true
}
→ requester_confirmed = true

# 6. AUTHOR подтверждает готовность
POST /api/ads/requests/:requestId/confirm
{
  "isRequester": false
}
→ Когда оба подтвердили: status = 'completed'
```

### Отклонение запроса:

```bash
POST /api/ads/requests/:requestId/decline
{
  "reason": "Уже нашел другого исполнителя"
}
→ ad_requests.status = 'rejected'
```

### Отмена pending запроса (requester):

```bash
DELETE /api/ads/requests/:requestId/cancel
→ ad_requests.status = 'cancelled'
→ Запись сохраняется (не удаляется)
```

### Удаление отклоненного запроса:

```bash
DELETE /api/ads/requests/:requestId/delete
→ Удаляет только если status = 'rejected'
```

---

## 📊 Работа с данными

### Получение запросов по статусам:

```sql
-- Входящие (для автора)
SELECT * FROM ad_requests ar
JOIN ads ON ar.ad_id = ads.id
WHERE ads.user_id = $1 AND ar.status IN ('pending', 'rejected');

-- Исходящие (для запросившего)
SELECT * FROM ad_requests 
WHERE requester_id = $1 AND status IN ('pending', 'rejected');

-- Активные в работе
SELECT * FROM ad_requests
WHERE (requester_id = $1 OR ad_id IN (SELECT id FROM ads WHERE user_id = $1))
  AND status IN ('accepted', 'in_progress');

-- Завершенные
SELECT * FROM ad_requests
WHERE status = 'completed'
ORDER BY completed_at DESC;

-- Отмененные/отклоненные
SELECT * FROM ad_requests
WHERE status IN ('cancelled', 'rejected')
ORDER BY updated_at DESC;
```

### Проверка истории по одному запросу:

```sql
SELECT id, status, updated_at 
FROM ad_requests 
WHERE id = $1
ORDER BY updated_at DESC;
```

---

## 🔄 Обратная совместимость

### Что сохраняется:

✅ Все существующие endpoints остаются (API не ломается)  
✅ Все существующие записи в ad_requests сохраняются  
✅ Логика work flow расширяется, не переписывается  

### Миграция данных:

```sql
-- Автоматически в migration-ad-requests-v2.sql:
UPDATE ad_requests SET status = 'rejected' WHERE status = 'declined';
```

### Старые клиенты:

- Клиенты, ожидающие `status = 'declined'`, должны быть обновлены на `'rejected'`
- Клиенты, удаляющие запросы через другие механизмы, будут видеть их как `'cancelled'`

---

## ✅ Чеклист развертывания

- [ ] Применить миграцию: `psql sosedik_db < migration-ad-requests-v2.sql`
- [ ] Обновить код: `src/models/Ad.js` и `src/routes/ads.js`
- [ ] Перезапустить сервер: `npm start`
- [ ] Протестировать новый endpoint: `POST /api/ads/requests/:id/start`
- [ ] Проверить логи на ошибки
- [ ] Обновить фронтенд (если необходимо отображение new statuses)
- [ ] Обновить документацию API
- [ ] Commit & Push изменений

---

## 🐛 Troubleshooting

**Ошибка: "relation 'ad_requests' does not exist"**
- Решение: Убедитесь, что применена миграция `migration-ads-system.sql`

**Ошибка: "Can only decline pending requests"**
- Проблема: Попытка отклонить не-pending запрос
- Решение: Проверьте текущий статус запроса

**Старые 'declined' записи не видны**
- Решение: Миграция переименует их в 'rejected' автоматически

**Несколько accepted запросов на одно объявление**
- Проблема: Не применена миграция с проверками
- Решение: Применить `migration-ad-requests-v2.sql`, затем выполнить вручную:
  ```sql
  -- Оставить первый accepted, остальные перевести в rejected
  UPDATE ad_requests SET status = 'rejected' 
  WHERE ad_id IN (
    SELECT ad_id FROM ad_requests 
    WHERE status IN ('accepted', 'in_progress')
    GROUP BY ad_id HAVING COUNT(*) > 1
  ) AND status = 'accepted' AND id NOT IN (
    SELECT MIN(id) FROM ad_requests 
    WHERE status IN ('accepted', 'in_progress')
    GROUP BY ad_id HAVING COUNT(*) > 1
  );
  ```

---

## 📚 Документация

- [PROJECT_STATE.md](PROJECT_STATE.md) — полное описание системы
- [migration-ad-requests-v2.sql](migration-ad-requests-v2.sql) — SQL миграция
- [src/models/Ad.js](src/models/Ad.js) — методы модели
- [src/routes/ads.js](src/routes/ads.js) — API endpoints

---

**Автор:** GitHub Copilot  
**Дата:** 23 апреля 2026  
**Версия:** 2.0  
**Статус:** ✅ Готово к применению
