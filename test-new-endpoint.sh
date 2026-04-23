#!/bin/bash

echo "🧪 Тест нового endpoint: POST /api/ads/requests/:id/start"
echo ""

# Токены (полные)
AUTHOR_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTgsInBob25lIjoiKzM3NTI5MjIyMjIyMiIsImxldmVsIjoxLCJpYXQiOjE3NzY5NTAzNzgsImV4cCI6MTc3NzU1NTE3OH0.EjgikSlGFgsxQcBM1FotB3G40-vSluAX4eU5OLWFtj0"
REQUESTER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTcsInBob25lIjoiKzM3NTI5MTExMTExMSIsImxldmVsIjoxLCJpYXQiOjE3NzY5NTAzNjUsImV4cCI6MTc3NzU1NTI2NX0.OB4o4pnpK8F6L7AqJmm6gRh50_5aDGkpJHFo02j1h_Q"

echo "1️⃣ Создание запроса на объявление (ID: 74)"
REQUEST_ID=$(curl -s -X POST http://localhost:3003/api/ads/74/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REQUESTER_TOKEN" \
  -d '{"message":"Интересует ваше объявление"}' | grep -o '"id":[0-9]*' | cut -d':' -f2)

echo "✅ Запрос создан с ID: $REQUEST_ID"
echo ""

echo "2️⃣ Принятие запроса (автором объявления)"
curl -s -X POST http://localhost:3003/api/ads/requests/$REQUEST_ID/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHOR_TOKEN" | grep -o '"status":"[^"]*"'

echo ""
echo "✅ Запрос принят"
echo ""

echo "3️⃣ ТЕСТ: Начало выполнения работы (NEW ENDPOINT)"
echo "📍 POST /api/ads/requests/$REQUEST_ID/start"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3003/api/ads/requests/$REQUEST_ID/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHOR_TOKEN")

echo "Ответ сервера:"
echo "$RESPONSE" | head -c 300

STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
MESSAGE=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

echo ""
echo ""
if [ "$STATUS" = "in_progress" ]; then
  echo "✅ ✅ ✅ УСПЕХ! Endpoint работает!"
  echo "   Статус изменен на: $STATUS"
  echo "   Сообщение: $MESSAGE"
else
  echo "❌ Что-то пошло не так"
  echo "   Статус: $STATUS"
fi
