const pool = require('../database');

module.exports = {
    // Проверить, может ли пользователь создать новое голосование
    canCreateElection: async (candidateId) => {
        // 1. Уровень 2
        const user = await pool.query('SELECT level, created_at FROM users WHERE id = $1', [candidateId]);
        if (user.rows.length === 0) return { allowed: false, reason: 'Пользователь не найден' };
        if (user.rows[0].level !== 2) return { allowed: false, reason: 'Только пользователи уровня 2 могут стать модератором' };

        // 2. Не менее 30 дней с регистрации → 1 минута для теста
        const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
        if (new Date(user.rows[0].created_at) > oneMinuteAgo) {
            return { allowed: false, reason: 'Вы должны быть зарегистрированы не менее 1 минуты' };
        }

        // 3. Минимум завершённых сделок (для теста можно 1)
        const deals = await pool.query(
            `SELECT COUNT(*)::int AS count FROM ad_requests
   WHERE (requester_id = $1 OR ad_id IN (SELECT id FROM ads WHERE user_id = $1))
     AND status = 'completed'`,
            [candidateId]
        );
        if (deals.rows[0].count < 1) {
            return { allowed: false, reason: 'Необходима хотя бы одна завершённая сделка' };
        }

        // 4. Нет активного голосования (status='active')
        const activeElection = await pool.query(
            'SELECT id FROM moderator_elections WHERE candidate_id = $1 AND status = $2',
            [candidateId, 'active']
        );
        if (activeElection.rows.length > 0) {
            return { allowed: false, reason: 'У вас уже есть активное голосование' };
        }

        // 5. С момента последнего завершённого голосования (отклонённого/истёкшего) прошло 30 дней
        const lastElection = await pool.query(
            `SELECT end_time FROM moderator_elections
       WHERE candidate_id = $1 AND status IN ('rejected', 'expired')
       ORDER BY end_time DESC LIMIT 1`,
            [candidateId]
        );
        if (lastElection.rows.length > 0) {
            const lastEnd = new Date(lastElection.rows[0].end_time);
            if ((Date.now() - lastEnd.getTime()) < 1 * 60 * 1000) { // 1 минута
                return { allowed: false, reason: 'До повторной попытки должна пройти минимум 1 минута' };
            }
        }

        // 6. Лимит на количество активных голосований (не более 3 одновременно)
        const activeCount = await pool.query(
            "SELECT COUNT(*)::int AS count FROM moderator_elections WHERE status = 'active'"
        );
        if (activeCount.rows[0].count >= 3) {
            return { allowed: false, reason: 'Слишком много активных голосований. Попробуйте позже.' };
        }

        return { allowed: true };
    },

    // Создать голосование
    createElection: async (candidateId) => {
        const result = await pool.query(
            `INSERT INTO moderator_elections (candidate_id, start_time, end_time)
       VALUES ($1, NOW(), NOW() + INTERVAL '2 minutes')
       RETURNING *`,
            [candidateId]
        );
        return result.rows[0];
    },

    // Проголосовать
    vote: async (electionId, voterId, vote) => {
        // Проверить, что голосование активно и избиратель не кандидат
        const election = await pool.query(
            'SELECT * FROM moderator_elections WHERE id = $1 AND status = $2',
            [electionId, 'active']
        );
        if (election.rows.length === 0) throw new Error('Голосование не активно');
        if (election.rows[0].candidate_id === voterId) throw new Error('Кандидат не может голосовать за себя');

        // Проверить уровень голосующего (2+)
        const voter = await pool.query('SELECT level FROM users WHERE id = $1', [voterId]);
        if (voter.rows[0].level < 2) throw new Error('Голосовать могут только пользователи уровня 2 и выше');

        // Дата регистрации голосующего должна быть до начала голосования
        const voterCreated = await pool.query(
            'SELECT created_at FROM users WHERE id = $1',
            [voterId]
        );
        if (new Date(voterCreated.rows[0].created_at) > new Date(election.rows[0].start_time)) {
            throw new Error('Ваш аккаунт создан после начала голосования');
        }

        // Вставить голос (защита от дублирования через UNIQUE)
        const result = await pool.query(
            `INSERT INTO moderator_votes (election_id, voter_id, vote)
       VALUES ($1, $2, $3)
       ON CONFLICT (election_id, voter_id) DO NOTHING
       RETURNING *`,
            [electionId, voterId, vote]
        );
        if (result.rows.length === 0) throw new Error('Вы уже проголосовали');
        return result.rows[0];
    },

    // Получить список активных голосований (с количеством голосов)
    getActiveElections: async () => {
        const result = await pool.query(`
      SELECT e.id, e.candidate_id, u.name AS candidate_name, e.start_time, e.end_time,
             (SELECT COUNT(*) FROM moderator_votes WHERE election_id = e.id AND vote = true) AS yes_votes,
             (SELECT COUNT(*) FROM moderator_votes WHERE election_id = e.id AND vote = false) AS no_votes
      FROM moderator_elections e
      JOIN users u ON e.candidate_id = u.id
      WHERE e.status = 'active'
      ORDER BY e.created_at DESC
    `);
        return result.rows;
    },

    // Завершить истекшие голосования (будем вызывать периодически)
    processExpiredElections: async () => {
        const expired = await pool.query(
            `SELECT id FROM moderator_elections
       WHERE status = 'active' AND end_time < NOW()`
        );

        for (const row of expired.rows) {
            const votes = await pool.query(
                'SELECT vote FROM moderator_votes WHERE election_id = $1',
                [row.id]
            );
            const yes = votes.rows.filter(v => v.vote === true).length;
            const no = votes.rows.filter(v => v.vote === false).length;

            let newStatus;
            if (yes >= 3 && yes > no) {
                // Повысить до уровня 3
                const election = await pool.query('SELECT candidate_id FROM moderator_elections WHERE id = $1', [row.id]);
                await pool.query('UPDATE users SET level = 3 WHERE id = $1', [election.rows[0].candidate_id]);
                newStatus = 'approved';
            } else {
                newStatus = 'rejected';
            }

            await pool.query(
                `UPDATE moderator_elections SET status = $1 WHERE id = $2`,
                [newStatus, row.id]
            );

            // Отправка уведомления кандидату (реализуй позже или используй Notification.createNotification)
        }
        return expired.rows.length;
    }
};