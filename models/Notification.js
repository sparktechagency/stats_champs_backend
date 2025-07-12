const mongoose = require("mongoose");
const modeType = {
  Subscriptions: "Subscriptions",
};

const NotificationsSchema = new mongoose.Schema(
  {
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver id is required"],
    },
    reference: {
      type: mongoose.Schema.Types.ObjectId,
      //   dynamic refference
      refPath: "model_type",
      required: [true, "Receiver id is required"],
    },
    model_type: {
      type: String,
      enum: Object.values(modeType),
    },
    message: {
      type: String,
      required: [true, "Message is required"],
    },
    description: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notifications", NotificationsSchema);

module.exports = Notification;
