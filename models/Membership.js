const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema({
  productId: { type: String },
  priceId: { type: String },
  planId: { type: String },
  name: { type: String },
  description: { type: String },
  amount: { type: Number },
  benifit: { type: String },
  interval: { type: String, default: "month" }, // Duration in days
  activated: { type: Boolean, default: true },
});

const Membership = mongoose.model("Membership", membershipSchema);
module.exports = Membership;
