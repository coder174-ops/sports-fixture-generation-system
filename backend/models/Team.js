const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String }, // batsman, bowler, all-rounder, wicketkeeper, etc.
  jerseyNumber: { type: Number }
});

const teamSchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  teamName: { type: String, required: true },
  captainName: { type: String, required: true },
  captainContact: { type: String },
  captainEmail: { type: String },
  players: [playerSchema],
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  seed: { type: Number, default: 0 }, // seeding based on past performance
  points: { type: Number, default: 0 }, // past performance points for seeding
  // Double Knockout tracking
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  bracket: { type: String, enum: ['winners', 'losers', 'eliminated', 'pending'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Team', teamSchema);
