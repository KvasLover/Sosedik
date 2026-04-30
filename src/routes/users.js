const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken, checkLevel } = require('../middleware/auth');

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update user profile
router.put('/me', verifyToken, async (req, res) => {
  try {
    const { name, apartment, show_apartment } = req.body;
    const updatedUser = await User.updateUserProfile(req.user.id, name, apartment, show_apartment || false);
    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user by ID (public profile)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Return only public info
    res.json({
      id: user.id,
      name: user.name,
      level: user.level,
      points: user.points,
      apartment: user.apartment
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add points (admin only, level 4)
router.post('/:id/points', verifyToken, checkLevel(4), async (req, res) => {
  try {
    const { points } = req.body;
    if (!points) {
      return res.status(400).json({ message: 'Points required' });
    }
    const updatedUser = await User.addPoints(req.params.id, points);
    res.json({ message: 'Points added', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user account
router.delete('/me', verifyToken, async (req, res) => {
  try {
    const deletedUser = await User.deleteUser(req.user.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:userId/profile', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });
    const profile = await User.getPublicProfileData(userId, req.user?.id);
    if (!profile) return res.status(404).json({ message: 'User not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;