const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

// Get conversation between current user and partner
router.get('/', verifyToken, async (req, res) => {
  try {
    const partnerId = parseInt(req.query.with, 10);
    if (!partnerId) {
      return res.status(400).json({ message: 'Partner id required' });
    }

    const user = await User.getUserById(partnerId);
    if (!user) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    const conversation = await Message.getConversation(req.user.id, partnerId);
    res.json({ partner: { id: user.id, name: user.name, photo: user.verification_photo }, messages: conversation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send message to partner
router.post('/', verifyToken, async (req, res) => {
  try {
    const receiverId = parseInt(req.body.receiverId, 10);
    const { content } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver id and content are required' });
    }

    if (receiverId === senderId) {
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }

    const receiver = await User.getUserById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const message = await Message.createMessage(senderId, receiverId, content);
    res.status(201).json({ message: 'Message sent', data: message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;