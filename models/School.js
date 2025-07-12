const mongoose = require("mongoose");

const SchoolSchema = new mongoose.Schema({
  photo: { type: String },
  name: { type: String, required: true },
  contact: { type: Number, required: true },
  location: {
    type: {
      type: String, // 'Point'
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  about: { type: String, required: true },
  activated: { type: Boolean, default: true },
  ppg: { type: Number, default: 0 }, // Points per game
  rpg: { type: Number, default: 0 }, // Rebounds per game
  apg: { type: Number, default: 0 }, // Assists per game
  stl: { type: Number, default: 0 }, // Steals per game
});

module.exports = mongoose.model("School", SchoolSchema);
