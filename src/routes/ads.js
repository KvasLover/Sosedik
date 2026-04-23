const express = require('express');
const router = express.Router();
const pool = require('../database');
const Ad = require('../models/Ad');
const { verifyToken, checkLevel } = require('../middleware/auth');

// Get all ads (public, level 0+)
router.get('/', async (req, res) => {
  try {
    const { category, type } = req.query;
    const ads = await Ad.getAds({ category, type });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get accepted ads for current user
router.get('/accepted', verifyToken, async (req, res) => {
  try {
    const acceptedAds = await Ad.getAcceptedAds(req.user.id);
    res.json(acceptedAds);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user's own ads
router.get('/my', verifyToken, async (req, res) => {
  try {
    const userAds = await Ad.getUserAds(req.user.id);
    res.json(userAds);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get ad by ID
router.get('/:id', async (req, res) => {
  try {
    const ad = await Ad.getAdById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    res.json(ad);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create ad (level 1+)
router.post('/', verifyToken, checkLevel(1), async (req, res) => {
  try {
    const { category, title, description, price, contact } = req.body;

    if (!category || !title || !description) {
      return res.status(400).json({ message: 'Category, title, description required' });
    }

    const newAd = await Ad.createAd(
      req.user.id,
      category,
      title,
      description,
      price,
      contact
    );

    res.status(201).json({ message: 'Ad created', ad: newAd });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Accept ad
router.post('/:id/accept', verifyToken, async (req, res) => {
  try {
    const ad = await Ad.getAdById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    if (ad.user_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot accept your own ad' });
    }

    if (ad.accepted_by) {
      return res.status(409).json({ message: 'Ad already accepted' });
    }

    const acceptedAd = await Ad.acceptAd(req.params.id, req.user.id);
    res.json({ message: 'Ad accepted', ad: acceptedAd });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cancel acceptance of ad
router.delete('/:id/accept', verifyToken, async (req, res) => {
  try {
    const ad = await Ad.getAdById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    if (ad.accepted_by !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this acceptance' });
    }

    const canceledAd = await Ad.cancelAd(req.params.id);
    res.json({ message: 'Acceptance canceled', ad: canceledAd });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update ad
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const ad = await Ad.getAdById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    if (ad.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, category, location } = req.body;
    const updatedAd = await Ad.updateAd(req.params.id, title, description, category, location);
    res.json({ message: 'Ad updated', ad: updatedAd });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete ad (archive)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const ad = await Ad.getAdById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    if (ad.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Ad.deleteAd(req.params.id);
    res.json({ message: 'Ad deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== НОВЫЕ РОУТЫ ДЛЯ СИСТЕМЫ ЗАПРОСОВ =====

// Создать запрос на принятие объявления
router.post('/:id/request', verifyToken, async (req, res) => {
  try {
    const ad = await Ad.getAdById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    if (ad.user_id === req.user.id) return res.status(400).json({ message: 'Cannot request your own ad' });

    // 1. Проверяем, нет ли уже активного запроса (pending, accepted, in_progress)
    const activeRequest = await pool.query(`
      SELECT id FROM ad_requests
      WHERE ad_id = $1 AND requester_id = $2
        AND status IN ('pending', 'accepted', 'in_progress')
    `, [req.params.id, req.user.id]);

    if (activeRequest.rows.length > 0) {
      return res.status(409).json({ message: 'You already have an active request for this ad' });
    }

    // 2. Защита от спама: нельзя отправлять новый запрос, если предыдущий был отклонён менее 30 секунд назад
    const recentRejected = await pool.query(`
      SELECT id FROM ad_requests
      WHERE ad_id = $1 AND requester_id = $2 AND status = 'rejected'
        AND updated_at > NOW() - INTERVAL '30 seconds'
    `, [req.params.id, req.user.id]);

    if (recentRejected.rows.length > 0) {
      return res.status(429).json({ message: 'You can send a new request only after 30 seconds since the last rejection' });
    }

    // 3. Создаём новый запрос
    const { message } = req.body;
    const request = await Ad.createAdRequest(req.params.id, req.user.id, message);
    res.status(201).json({ message: 'Request sent', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить входящие запросы (для автора объявления)
router.get('/requests/incoming', verifyToken, async (req, res) => {
  try {
    const requests = await Ad.getIncomingRequests(req.user.id);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить исходящие запросы (для запрашивающего)
router.get('/requests/outgoing', verifyToken, async (req, res) => {
  try {
    const requests = await Ad.getOutgoingRequests(req.user.id);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить активные запросы пользователя
router.get('/requests/active', verifyToken, async (req, res) => {
  try {
    const requests = await Ad.getActiveRequests(req.user.id);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Принять запрос на объявление
router.post('/requests/:requestId/accept', verifyToken, async (req, res) => {
  try {
    const acceptedRequest = await Ad.acceptAdRequest(req.params.requestId, req.user.id);
    res.json({ message: 'Request accepted', request: acceptedRequest });
  } catch (err) {
    if (err.message.includes('Not authorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

// Отклонить запрос на объявление
router.post('/requests/:requestId/decline', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Decline reason is required' });
    }

    const declinedRequest = await Ad.declineAdRequest(req.params.requestId, req.user.id, reason);
    res.json({ message: 'Request declined', request: declinedRequest });
  } catch (err) {
    if (err.message.includes('Not authorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('Can only decline')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

// Начать выполнение запроса (accepted → in_progress)
router.post('/requests/:requestId/start', verifyToken, async (req, res) => {
  try {
    const startedRequest = await Ad.startAdRequest(req.params.requestId, req.user.id);
    res.json({ message: 'Request started', request: startedRequest });
  } catch (err) {
    if (err.message.includes('Not authorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('Can only start')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

// Подтвердить выполнение работы
router.post('/requests/:requestId/confirm', verifyToken, async (req, res) => {
  try {
    const confirmedRequest = await Ad.confirmAdCompletion(req.params.requestId, req.user.id);
    res.json({ message: 'Completion confirmed', request: confirmedRequest });
  } catch (err) {
    if (err.message.includes('Not authorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('Can only confirm')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

// Удалить отклоненный запрос
router.delete('/requests/:requestId/delete', verifyToken, async (req, res) => {
  try {
    const deletedRequest = await Ad.deleteDeclinedRequest(req.params.requestId, req.user.id);
    res.json({ message: 'Request deleted', request: deletedRequest });
  } catch (err) {
    if (err.message.includes('Not authorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('Can only delete rejected')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

// Cancel pending request (только запросивший может отменить, pending → cancelled)
router.delete('/requests/:requestId/cancel', verifyToken, async (req, res) => {
  try {
    const cancelledRequest = await Ad.cancelAdRequest(req.params.requestId, req.user.id);
    res.json({ message: 'Request cancelled', request: cancelledRequest });
  } catch (err) {
    if (err.message.includes('Not authorized')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('Can only cancel pending')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;