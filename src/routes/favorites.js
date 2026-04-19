const express = require('express');
const router = express.Router();
const Favorite = require('../models/Favorite');
const Ad = require('../models/Ad');
const Rental = require('../models/Rental');
const { verifyToken } = require('../middleware/auth');

// Add to favorites
router.post('/', verifyToken, async (req, res) => {
  try {
    const { itemType, itemId } = req.body;

    if (!itemType || !itemId) {
      return res.status(400).json({ message: 'itemType and itemId required' });
    }

    if (!['ad', 'rental'].includes(itemType)) {
      return res.status(400).json({ message: 'itemType must be "ad" or "rental"' });
    }

    // Check if item exists
    let item;
    if (itemType === 'ad') {
      item = await Ad.getAdById(itemId);
    } else {
      item = await Rental.getRentalById(itemId);
    }

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user is not the owner
    if (itemType === 'ad' && item.user_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot add own ad to favorites' });
    }
    if (itemType === 'rental' && item.owner_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot add own rental to favorites' });
    }

    const favorite = await Favorite.addToFavorites(req.user.id, itemType, itemId);
    res.status(201).json({ message: 'Added to favorites', favorite });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove all favorites for current user
router.delete('/all', verifyToken, async (req, res) => {
  try {
    await Favorite.removeAllFavorites(req.user.id);
    res.json({ message: 'All favorites removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove from favorites
router.delete('/:itemType/:itemId', verifyToken, async (req, res) => {
  try {
    const { itemType, itemId } = req.params;

    if (!['ad', 'rental'].includes(itemType)) {
      return res.status(400).json({ message: 'itemType must be "ad" or "rental"' });
    }

    const favorite = await Favorite.removeFromFavorites(req.user.id, itemType, parseInt(itemId));
    if (!favorite) {
      return res.status(404).json({ message: 'Item not in favorites' });
    }

    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user's favorites
router.get('/', verifyToken, async (req, res) => {
  try {
    const itemType = req.query.itemType || req.query.type;
    const favorites = await Favorite.getUserFavorites(req.user.id, itemType);

    // Get full item data for each favorite
    const favoritesWithData = await Promise.all(
      favorites.map(async (fav) => {
        let item;
        if (fav.item_type === 'ad') {
          item = await Ad.getAdById(fav.item_id);
        } else {
          item = await Rental.getRentalById(fav.item_id);
        }

        return {
          ...fav,
          item: item
        };
      })
    );

    // Filter out favorites with non-existent items
    const validFavorites = favoritesWithData.filter(fav => fav.item !== null && fav.item !== undefined);

    res.json(validFavorites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check if item is in favorites
router.get('/:itemType/:itemId', verifyToken, async (req, res) => {
  try {
    const { itemType, itemId } = req.params;

    if (!['ad', 'rental'].includes(itemType)) {
      return res.status(400).json({ message: 'itemType must be "ad" or "rental"' });
    }

    const isFavorite = await Favorite.isInFavorites(req.user.id, itemType, parseInt(itemId));
    res.json({ isFavorite });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;