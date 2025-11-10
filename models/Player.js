const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    photo: { type: String, default: null },
    sportsType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SportType",
      default: null,
    },
    name: { type: String, required: true, default: null },
    no: { type: Number, required: true, default: null },
    country: { type: String, required: true, default: null },
    dateOfBirth: { type: Date, required: true, default: null },
    height: { type: Number, required: true, default: null },
    weight: { type: Number, required: true, default: null },
    activated: { type: Boolean, default: true, default: null },
    details: { type: String, default: null },
    stats: [
      {
        gameId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Game",
          default: null,
        },
        stats: { type: Map, of: Number, default: null },
        date: { type: Date, default: Date.now ,default:null},
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Player", PlayerSchema);
