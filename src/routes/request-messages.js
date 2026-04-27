const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const RequestMessage = require('../models/RequestMessage');
const pool = require('../database');
const Notification = require('../models/Notification');

// GET /api/request-messages?requestId=...
router.get('/', verifyToken, async (req, res) => {
  try {
    const requestId = parseInt(req.query.requestId);
    if (!requestId) return res.status(400).json({ message: 'requestId required' });

    // Проверка доступа: пользователь должен быть участником сделки
    const accessCheck = await pool.query(`
      SELECT ar.id, ar.requester_id, ads.user_id as owner_id
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);

    if (accessCheck.rows.length === 0) return res.status(404).json({ message: 'Request not found' });

    const reqData = accessCheck.rows[0];
    if (reqData.requester_id !== req.user.id && reqData.owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await RequestMessage.getMessagesByRequestId(requestId);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/request-messages
router.post('/', verifyToken, async (req, res) => {
  try {
    const { requestId, text } = req.body;
    if (!requestId) return res.status(400).json({ message: 'requestId required' });
    if (!text || typeof text !== 'string') return res.status(400).json({ message: 'text required' });

    const trimmedText = text.trim();
    if (trimmedText.length === 0) return res.status(400).json({ message: 'text cannot be empty' });
    if (trimmedText.length > 2000) return res.status(400).json({ message: 'text too long (max 2000)' });

    // Проверка доступа и статуса запроса
    const accessCheck = await pool.query(`
      SELECT ar.id, ar.requester_id, ar.status, ads.user_id as owner_id
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);

    if (accessCheck.rows.length === 0) return res.status(404).json({ message: 'Request not found' });

    const reqData = accessCheck.rows[0];
    if (reqData.requester_id !== req.user.id && reqData.owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Разрешённые статусы: accepted, in_progress
    if (!['accepted', 'in_progress'].includes(reqData.status)) {
      return res.status(403).json({ message: 'Chat is not available for this request status' });
    }

    const message = await RequestMessage.createMessage(requestId, req.user.id, trimmedText);

    // --- Уведомление другому участнику (с защитой от ошибок) ---
    try {
      const participants = await pool.query(`
    SELECT requester_id, ads.user_id as ad_owner_id
    FROM ad_requests
    JOIN ads ON ad_requests.ad_id = ads.id
    WHERE ad_requests.id = $1
  `, [requestId]);

      if (participants.rows.length > 0) {
        const otherUserId = (req.user.id === participants.rows[0].requester_id)
          ? participants.rows[0].ad_owner_id
          : participants.rows[0].requester_id;

        await Notification.createNotification(
          otherUserId,
          'new_message',
          `Новое сообщение в сделке`,
          null,
          requestId,          // related_id
          'request'           // related_type
        );
      }
    } catch (notifErr) {
      console.error('Ошибка при создании уведомления о сообщении:', notifErr);
      // Не прерываем выполнение, сообщение уже сохранено
    }
    // --- Конец уведомления ---

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;