const mongoose = require("mongoose");

const CourtSchema = new mongoose.Schema({
  photo: { type: String },
  sportsType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SportType",
  },
  name: { type: String, required: true },
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
  about: { type: String },
  activated: { type: Boolean, default: true },
});

module.exports = mongoose.model("Court", CourtSchema);
