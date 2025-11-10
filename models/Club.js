const mongoose = require("mongoose");

const ClubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  photo: { type: String ,default:null},
  contact: { type: Number, required: true },
  email: { type: String, required: true },
  skill: { type: String, required: true },
  videoUrl: { type: String ,default:null},
  practicesImages: [{ type: String ,default:null}],
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
  headline: { type: String, required: true },
  shortDescription: { type: String, required: true },
  fullDescription: { type: String, required: true },
  activated: { type: Boolean, default: true },
});

module.exports = mongoose.model("Club", ClubSchema);
