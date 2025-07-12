const mongoose = require("mongoose");
const { type } = require("os");

const ClinicSchema = new mongoose.Schema({
  clinicName: { type: String, required: true },
  ownerName: { type: String, required: true },
  photo: { type: String },
  contact: { type: Number, required: true },
  email: { type: String, required: true },
  videoUrl: { type: String },
  practicesImages: [{ type: String }],
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

module.exports = mongoose.model("Clinic", ClinicSchema);
