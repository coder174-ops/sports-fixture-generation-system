const express = require('express');
const Tournament = require('../models/Tournament');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// Get all tournaments (public)
router.get('/', async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 });
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single tournament
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create tournament (admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const tournament = new Tournament({ ...req.body, createdBy: req.user._id });
    await tournament.save();
    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update tournament (admin only)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete tournament (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Tournament.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tournament deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
