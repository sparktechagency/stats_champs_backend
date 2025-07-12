const { Schema, default: mongoose } = require("mongoose");

const subscriptionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    membership: { type: Schema.Types.ObjectId, ref: "Membership" },
    amount: { type: Number, require: true },
    isPaid: { type: Boolean, default: false },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    isActive: { type: Boolean, default: null },
    paymentIntentId: { type: String, default: null }, // Add this field
  },
  {
    timestamps: true,
  }
);

const Subscription = mongoose.model("Subscriptions", subscriptionSchema);
module.exports = Subscription;
