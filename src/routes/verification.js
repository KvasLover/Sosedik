const express = require('express');
const router = express.Router();
const { verifyToken, checkLevel } = require('../middleware/auth');
const Verification = require('../models/Verification');
const Notification = require('../models/Notification');

// Получить статус (есть ли ожидающая заявка)
router.get('/status', verifyToken, async (req, res) => {
  try {
    const hasPending = await Verification.hasPendingRequest(req.user.id);
    res.json({ hasPending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Подать заявку на верификацию (уровень 1)
router.post('/request', verifyToken, checkLevel(1), async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ message: 'Фото обязательно' });

    // Проверяем, нет ли уже активной заявки
    const alreadyPending = await Verification.hasPendingRequest(req.user.id);
    if (alreadyPending) {
      return res.status(409).json({ message: 'У вас уже есть заявка на рассмотрении' });
    }

    const request = await Verification.createRequest(req.user.id, photo);

    // Уведомление модераторам (уровень 3 и 4)
    const pool = require('../database');
    const moderators = await pool.query(
      'SELECT id FROM users WHERE level >= 3'
    );
    for (const mod of moderators.rows) {
      await Notification.createNotification(
        mod.id,
        'verification_request',
        'Новая заявка на верификацию жильца',
        null,
        request.id,
        'verification'
      );
    }

    res.status(201).json({ message: 'Заявка отправлена' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить список заявок (для модераторов, уровень 3+)
router.get('/pending', verifyToken, checkLevel(3), async (req, res) => {
  try {
    const requests = await Verification.getPendingRequests();
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Принять или отклонить заявку (модератор, уровень 3+)
router.put('/:id/review', verifyToken, checkLevel(3), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' или 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Статус должен быть approved или rejected' });
    }

    const request = await Verification.updateRequestStatus(id, status, req.user.id);

    // Уведомление пользователю
    const message = status === 'approved'
      ? 'Ваша заявка на верификацию одобрена. Уровень повышен до 2.'
      : 'Ваша заявка на верификацию отклонена.';
    await Notification.createNotification(
      request.user_id,
      'verification_reviewed',
      message
    );

    res.json({ message: 'Заявка обработана' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;