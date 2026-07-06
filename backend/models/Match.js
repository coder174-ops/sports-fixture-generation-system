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
  bracketType: { type: String, enum: ['winners', 'losers', 'grand_final', 'knockout', 'league'], required: true },
  // Combination-format extras
    stage: { type: Number, default: 1 },        // 1 = first stage, 2 = second stage
    stageLabel: { type: String },                // e.g. "Knockout Stage", "League Stage"
    groupName: { type: String, default: null },  // e.g. "Group A" (league/group-knockout matches)
    sourceMatchA: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null }, // teamA = winner of this match (used for league re-pairing)
    sourceMatchB: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
    sourceGroupA: { type: String, default: null }, // teamA = winner of this group (league cum knockout)
    sourceGroupB: { type: String, default: null },
    decidesChampion: { type: Boolean, default: false },
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
