const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    country: { type: String, required: true },
    address: { type: String, required: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },
    dateOfBirth: {
      type: Date,
    },
    password: { type: String, required: true },
    contactNumber: { type: Number, required: true },
    date: { type: Date, default: Date.now, default: null },
    stripeCustomerId: { type: String, default: null }, // For Stripe users
    paypalSubscriptionId: { type: String, default: null }, // For PayPal user
    currentSubscriptions: {
      type: mongoose.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },
    accountType: {
      type: String,
      enum: ["Guest", "Player", "Coach"],
      default: "Guest",
    },
    blocked: { type: Boolean, default: false },
    role: { type: String, enum: ["User", "Admin"], default: "User" },
    resetToken: { type: String, default: null },
    resetTokenExpiration: { type: Date, default: null },
    otpCode: { type: String, default: null },
    otpCodeExpiration: { type: Date, default: null },
    verified: { type: Boolean, default: false },
    fcmToken: { type: String, default: null }, // Add this field
  },
  {
    timestamps: true,
  }
);

// Hash passwords before saving to the database
UserSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

module.exports = mongoose.model("User", UserSchema);
