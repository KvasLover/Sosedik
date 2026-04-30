const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Review = require('../models/Review');
const pool = require('../database');

// POST /api/reviews – оставить отзыв
router.post('/reviews', verifyToken, async (req, res) => {
  try {
    const { requestId, result, reason, comment } = req.body;
    if (!requestId || !result || !['success', 'problem', 'failed'].includes(result)) {
      return res.status(400).json({ message: 'Invalid data' });
    }

    const deal = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);
    if (deal.rows.length === 0) return res.status(404).json({ message: 'Request not found' });
    const reqData = deal.rows[0];

    if (reqData.status === 'disputed') {
      return res.status(400).json({ message: 'Cannot review disputed request' });
    }
    
    if (reqData.status !== 'completed') return res.status(400).json({ message: 'Deal not completed' });
    if (reqData.review_phase_closed) return res.status(400).json({ message: 'Review phase closed' });

    const userId = req.user.id;
    let isCreator = false;
    if (reqData.ad_owner_id === userId) isCreator = true;
    else if (reqData.requester_id === userId) isCreator = false;
    else return res.status(403).json({ message: 'Not a participant' });

    const doneField = isCreator ? 'creator_review_done' : 'requester_review_done';
    if (reqData[doneField] === true) {
      return res.status(400).json({ message: 'You already reviewed this deal' });
    }

    const reviewedUserId = (userId === reqData.requester_id) ? reqData.ad_owner_id : reqData.requester_id;
    await Review.createReview(requestId, userId, reviewedUserId, result, reason, comment);
    await Review.markReviewDone(requestId, userId, isCreator);
    await Review.closeReviewPhaseIfBothDone(requestId);

    res.json({ message: 'Review saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/reviews/skip – пропустить оценку
router.post('/reviews/skip', verifyToken, async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ message: 'requestId required' });

    const deal = await pool.query(`
      SELECT ar.*, ads.user_id as ad_owner_id
      FROM ad_requests ar
      JOIN ads ON ar.ad_id = ads.id
      WHERE ar.id = $1
    `, [requestId]);
    if (deal.rows.length === 0) return res.status(404).json({ message: 'Request not found' });
    const reqData = deal.rows[0];
    if (reqData.status !== 'completed') return res.status(400).json({ message: 'Deal not completed' });
    if (reqData.review_phase_closed) return res.status(400).json({ message: 'Review phase closed' });

    const userId = req.user.id;
    let isCreator = false;
    if (reqData.ad_owner_id === userId) isCreator = true;
    else if (reqData.requester_id === userId) isCreator = false;
    else return res.status(403).json({ message: 'Not a participant' });

    const doneField = isCreator ? 'creator_review_done' : 'requester_review_done';
    if (reqData[doneField] === true) {
      return res.status(400).json({ message: 'You already skipped or reviewed' });
    }

    await Review.markReviewDone(requestId, userId, isCreator);
    await Review.closeReviewPhaseIfBothDone(requestId);

    res.json({ message: 'Skipped' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/deals – список завершённых сделок пользователя
router.get('/deals', verifyToken, async (req, res) => {
  try {
    const deals = await Review.getCompletedDealsForUser(req.user.id);
    res.json({ deals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/:id/reputation – агрегированная репутация
router.get('/users/:id/reputation', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const rep = await Review.getUserReputation(userId);
    res.json(rep);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;