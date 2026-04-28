const pool = require('../database');

const createReview = async (requestId, reviewerId, reviewedUserId, result, reason, comment) => {
  const res = await pool.query(`
    INSERT INTO reviews (request_id, reviewer_id, reviewed_user_id, result, reason, comment)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [requestId, reviewerId, reviewedUserId, result, reason, comment]);
  return res.rows[0];
};

const markReviewDone = async (requestId, userId, isCreator) => {
  const field = isCreator ? 'creator_review_done' : 'requester_review_done';
  const res = await pool.query(`
    UPDATE ad_requests
    SET ${field} = true
    WHERE id = $1
    RETURNING *
  `, [requestId]);
  return res.rows[0];
};

const closeReviewPhaseIfBothDone = async (requestId) => {
  const res = await pool.query(`
    SELECT creator_review_done, requester_review_done
    FROM ad_requests
    WHERE id = $1
  `, [requestId]);
  if (res.rows.length === 0) return false;
  const row = res.rows[0];
  if (row.creator_review_done && row.requester_review_done) {
    await pool.query(`UPDATE ad_requests SET review_phase_closed = true WHERE id = $1`, [requestId]);
    return true;
  }
  return false;
};

const getUserReputation = async (userId) => {
  const total = await pool.query(`
    SELECT COUNT(DISTINCT ar.id) as total
    FROM ad_requests ar
    JOIN ads ON ar.ad_id = ads.id
    WHERE (ar.requester_id = $1 OR ads.user_id = $1) AND ar.status = 'completed'
  `, [userId]);
  const reviews = await pool.query(`
    SELECT result, COUNT(*) as cnt
    FROM reviews
    WHERE reviewed_user_id = $1
    GROUP BY result
  `, [userId]);
  let success = 0, problem = 0, failed = 0;
  for (const row of reviews.rows) {
    if (row.result === 'success') success = parseInt(row.cnt);
    else if (row.result === 'problem') problem = parseInt(row.cnt);
    else if (row.result === 'failed') failed = parseInt(row.cnt);
  }
  return {
    total_completed: parseInt(total.rows[0].total),
    success_count: success,
    problem_count: problem,
    failed_count: failed
  };
};

const getCompletedDealsForUser = async (userId) => {
  const deals = await pool.query(`
    SELECT ar.id as request_id, ar.status, ar.creator_review_done, ar.requester_review_done, ar.review_phase_closed,
           ads.title, ads.user_id as ad_owner_id, ar.requester_id,
           (ar.requester_id = $1) as is_requester
    FROM ad_requests ar
    JOIN ads ON ar.ad_id = ads.id
    WHERE (ar.requester_id = $1 OR ads.user_id = $1) AND ar.status = 'completed'
    ORDER BY ar.completed_at DESC
  `, [userId]);
  return deals.rows.map(row => ({
    request_id: row.request_id,
    title: row.title,
    role: row.is_requester ? 'requester' : 'creator',
    review_done: row.is_requester ? row.requester_review_done : row.creator_review_done,
    review_phase_closed: row.review_phase_closed,
    completed_at: row.completed_at
  }));
};

module.exports = {
  createReview,
  markReviewDone,
  closeReviewPhaseIfBothDone,
  getUserReputation,
  getCompletedDealsForUser
};