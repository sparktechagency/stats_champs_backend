const mongoose = require("mongoose");

const contentsSchema = new mongoose.Schema(
  {
    aboutUs: {
      type: String,
    },
    termsAndConditions: {
      type: String,
    },
    privacyPolicy: {
      type: String,
    },
    supports: {
      type: String,
    },
    
  },
  {
    timestamps: true,
  }
);

const Contents = mongoose.model("Contents", contentsSchema);
module.exports = Contents;
