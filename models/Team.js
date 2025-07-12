const mongoose = require("mongoose");

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String}, //  logo is url stored in cloud storage.
  sportsType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SportType",
  },

  players: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
    },
  ],
  activated: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Team", TeamSchema);
