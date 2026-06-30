const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },
  extras: { type: Number, default: 0 }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  matchNumber: { type: Number },
  round: { type: Number, required: true },
  roundName: { type: String },
  bracketType: { type: String, enum: ['winners', 'losers', 'grand_final'], required: true },
  teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  teamAScore: scoreSchema,
  teamBScore: scoreSchema,
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  loser: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  venue: { type: String },
  scheduledDate: { type: Date },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'bye'],
    default: 'scheduled'
  },
  isBye: { type: Boolean, default: false },
  // Links to next matches for auto-advance
  nextWinnerMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
  nextLoserMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Match', matchSchema);
