const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema({
  productId: { type: String ,default:null},
  priceId: { type: String ,default:null},
  planId: { type: String ,default:null},
  name: { type: String ,default:null},
  description: { type: String ,default:null},
  amount: { type: Number ,default:null},
  benifit: { type: String ,default:null},
  interval: { type: String, default: "month" }, // Duration in days
  activated: { type: Boolean, default: true },
});

const Membership = mongoose.model("Membership", membershipSchema);
module.exports = Membership;
