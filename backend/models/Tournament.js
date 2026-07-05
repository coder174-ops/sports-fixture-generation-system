const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sport: { type: String, required: true, enum: ['cricket', 'football', 'basketball', 'badminton', 'tennis', 'volleyball', 'other'] },
  format: { type: String, enum: ['single_knockout', 'double_knockout'], default: 'single_knockout' },
  maxTeams: { type: Number, required: true },
  playersPerTeam: { type: Number, required: true },
  venue: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  overs: { type: Number }, // for cricket
  description: { type: String },
  status: {
    type: String,
    enum: ['upcoming', 'registration_open', 'registration_closed', 'fixture_generated', 'ongoing', 'completed'],
    default: 'registration_open'
  },
  registrationDeadline: { type: Date },
  prizeInfo: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tournament', tournamentSchema);
