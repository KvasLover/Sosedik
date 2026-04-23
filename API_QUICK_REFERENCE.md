# Quick Reference: ad_requests API v2.0

## 📍 Статусы жизненного цикла

```
pending ────→ accepted ────→ in_progress ────→ completed
   ↓              ↓              
   └→ rejected    └→ in_progress
   ↓
   cancelled
```

## 🔗 Endpoints

### Создание запроса
```
POST /api/ads/:adId/request
{ "message": "text" }
→ status: pending
```

### Просмотр запросов
```
GET /api/ads/requests/incoming    (для автора: pending, rejected)
GET /api/ads/requests/outgoing    (для запросившего: pending, rejected)
GET /api/ads/requests/active      (для обоих: accepted, in_progress)
```

### Управление запросом (автор)
```
POST /api/ads/requests/:id/accept   → status: accepted (другие pending → rejected)
POST /api/ads/requests/:id/decline { "reason": "..." }  → status: rejected
```

### Управление запросом (запросивший)
```
DELETE /api/ads/requests/:id/cancel   → status: cancelled (только pending)
```

### Переход в работу (оба)
```
POST /api/ads/requests/:id/start   → status: in_progress (только из accepted)
```

### Подтверждение завершения (оба)
```
POST /api/ads/requests/:id/confirm { "isRequester": true|false }
→ Когда оба подтвердили: status: completed
```

### Удаление
```
DELETE /api/ads/requests/:id/delete   (только rejected)
```

---

## ✅ Проверки состояния

| Действие | Условие | Ошибка |
|---------|---------|--------|
| Accept | status = pending | Can only accept pending |
| Decline | status = pending | Can only decline pending |
| Cancel | status = pending, requester | Can only cancel pending |
| Start | status = accepted, either party | Can only start accepted |
| Confirm | status = in_progress | Can only confirm in_progress |
| Delete | status = rejected, any party | Can only delete rejected |

---

## 🔐 Права доступа

| Операция | Кто может |
|----------|-----------|
| Accept/Decline | Автор объявления |
| Cancel | Запросивший (только pending) |
| Start | Любой (автор или запросивший) |
| Confirm | Любой (своя сторона) |
| Delete | Любой (для rejected) |

---

## 📊 Примеры

### Полный цикл
```bash
# 1. Создание запроса
POST /api/ads/42/request
{ "message": "Интересует" }
→ {"id": 123, "status": "pending", ...}

# 2. Просмотр входящих (автором)
GET /api/ads/requests/incoming
→ [{"id": 123, "status": "pending", ...}]

# 3. Принятие (автором)
POST /api/ads/requests/123/accept
→ {"id": 123, "status": "accepted", ...}

# 4. Начало работы (кем-либо)
POST /api/ads/requests/123/start
→ {"id": 123, "status": "in_progress", ...}

# 5. Подтверждение (запросившим)
POST /api/ads/requests/123/confirm
{ "isRequester": true }
→ {"id": 123, "status": "in_progress", "requester_confirmed": true, ...}

# 6. Подтверждение (автором)
POST /api/ads/requests/123/confirm
{ "isRequester": false }
→ {"id": 123, "status": "completed", ...}
```

### Отклонение
```bash
POST /api/ads/requests/123/decline
{ "reason": "Нашел другого" }
→ {"id": 123, "status": "rejected", "decline_reason": "...", ...}

# Удаление отклоненного
DELETE /api/ads/requests/123/delete
→ {"message": "Request deleted", ...}
```

### Отмена
```bash
DELETE /api/ads/requests/123/cancel
→ {"id": 123, "status": "cancelled", ...}  # Сохраняется, не удаляется
```

---

## 🔍 SQL запросы

### Все запросы по пользователю
```sql
SELECT * FROM ad_requests 
WHERE requester_id = $1 OR ad_id IN (SELECT id FROM ads WHERE user_id = $1)
ORDER BY updated_at DESC;
```

### Активные работы
```sql
SELECT * FROM ad_requests 
WHERE status IN ('accepted', 'in_progress');
```

### История завершенных
```sql
SELECT * FROM ad_requests 
WHERE status = 'completed' 
ORDER BY completed_at DESC;
```

---

**v2.0 — Апрель 2026**
