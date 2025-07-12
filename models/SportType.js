const mongoose = require('mongoose');

const sportTypeSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "basketball", "soccer", etc.
  playerStats: [String], // List of player stats relevant to the sport
  teamStats: [String],   // List of team stats relevant to the sport
});

module.exports = mongoose.model('SportType', sportTypeSchema);