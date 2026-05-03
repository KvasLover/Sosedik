const express = require('express');
const router = express.Router();
const { verifyToken, checkLevel } = require('../middleware/auth');
const Election = require('../models/Election');
const Notification = require('../models/Notification');

// Подать заявку на модератора (инициировать голосование)
router.post('/start', verifyToken, checkLevel(2), async (req, res) => {
    try {
        const check = await Election.canCreateElection(req.user.id);
        if (!check.allowed) {
            return res.status(400).json({ message: check.reason });
        }
        const election = await Election.createElection(req.user.id);
        await Notification.createNotification(
            req.user.id,
            'election_started',
            'Ваше голосование на роль модератора началось!'
        );
        res.status(201).json({ message: 'Голосование запущено', election });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Проголосовать
router.post('/vote/:electionId', verifyToken, checkLevel(2), async (req, res) => {
    try {
        const { vote } = req.body; // true/false
        if (typeof vote !== 'boolean') {
            return res.status(400).json({ message: 'Нужно указать vote (true/false)' });
        }
        const voteRecord = await Election.vote(req.params.electionId, req.user.id, vote);
        res.json({ message: 'Голос учтён', vote: voteRecord });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Активные голосования
router.get('/active', verifyToken, async (req, res) => {
    try {
        const elections = await Election.getActiveElections();
        res.json({ elections });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Проверка, может ли пользователь создать голосование
router.get('/can-start', verifyToken, checkLevel(2), async (req, res) => {
    try {
        const check = await Election.canCreateElection(req.user.id);
        res.json(check);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/completed', verifyToken, async (req, res) => {
    try {
        const elections = await Election.getCompletedElections();
        res.json({ elections });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;