const express = require('express');
const router = express.Router();
const Rental = require('../models/Rental');
const { verifyToken, checkLevel } = require('../middleware/auth');

// Get all rentals (public)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const rentals = await Rental.getRentals({ category });
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get rental by ID
router.get('/:id', async (req, res) => {
  try {
    const rental = await Rental.getRentalById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }
    res.json(rental);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create rental (level 1+)
router.post('/', verifyToken, checkLevel(1), async (req, res) => {
  try {
    const { itemName, category, photos, rentalTerms, valueCategory } = req.body;

    if (!itemName || !category) {
      return res.status(400).json({ message: 'Item name and category required' });
    }

    const newRental = await Rental.createRental(
      req.user.id,
      itemName,
      category,
      photos || [],
      rentalTerms,
      valueCategory
    );

    res.status(201).json({ message: 'Rental created', rental: newRental });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get rentals by owner (authenticated)
router.get('/my', verifyToken, async (req, res) => {
  try {
    const rentals = await Rental.getRentalsByOwner(req.user.id);
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete rental (owner only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const rental = await Rental.getRentalById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    if (rental.owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this rental' });
    }

    const deletedRental = await Rental.deleteRental(req.params.id, req.user.id);
    if (deletedRental) {
      res.json({ message: 'Rental deleted successfully' });
    } else {
      res.status(404).json({ message: 'Rental not found' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;