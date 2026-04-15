const express = require('express');
const router = express.Router();
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

module.exports = router;