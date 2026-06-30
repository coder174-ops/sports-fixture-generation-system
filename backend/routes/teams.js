const express = require('express');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// Get teams for a tournament
router.get('/tournament/:tournamentId', async (req, res) => {
  try {
    const teams = await Team.find({ tournament: req.params.tournamentId });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all teams (admin)
router.get('/', adminAuth, async (req, res) => {
  try {
    const teams = await Team.find().populate('tournament', 'name sport');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register team for tournament
router.post('/register', auth, async (req, res) => {
  try {
    const { tournamentId, teamName, captainName, captainContact, captainEmail, players, points } = req.body;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    if (tournament.status !== 'registration_open') {
      return res.status(400).json({ message: 'Registration is not open for this tournament' });
    }
    const existingCount = await Team.countDocuments({ tournament: tournamentId, status: 'approved' });
    if (existingCount >= tournament.maxTeams) {
      return res.status(400).json({ message: 'Tournament is full' });
    }
    const existingTeam = await Team.findOne({ tournament: tournamentId, teamName });
    if (existingTeam) return res.status(400).json({ message: 'Team name already taken' });

    const team = new Team({
      tournament: tournamentId,
      teamName,
      captainName,
      captainContact,
      captainEmail,
      players: players || [],
      points: points || 0,
      registeredBy: req.user._id
    });
    await team.save();
    res.status(201).json({ message: 'Team registered successfully, pending approval', team });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve/Reject team (admin)
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, seed, points } = req.body;
    const team = await Team.findByIdAndUpdate(req.params.id, { status, seed, points }, { new: true });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update team seed/points (admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete team (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Team.findByIdAndDelete(req.params.id);
    res.json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my teams
router.get('/my/teams', auth, async (req, res) => {
  try {
    const teams = await Team.find({ registeredBy: req.user._id }).populate('tournament', 'name sport status');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
