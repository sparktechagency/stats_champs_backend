const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema({
  photo: {
    type: String,
    default: null,
  },

  sportsType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SportType",
    default: null,
  },
  details: { type: String, default: null },

  name: {
    type: String,
    required: true,
    default: null,
  },

  startDate: {
    type: Date,
    required: true,
    default: null,
  },

  endDate: {
    type: Date,
    required: true,
    default: null,
  },

  games: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      default: null,
    },
  ],
});

const Tournament = mongoose.model("Tournament", tournamentSchema);
module.exports = Tournament;
