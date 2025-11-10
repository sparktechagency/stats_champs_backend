const mongoose = require("mongoose");

const contentsSchema = new mongoose.Schema(
  {
    aboutUs: {
      type: String,default:null
    },
    termsAndConditions: {
      type: String,default:null
    },
    privacyPolicy: {
      type: String,default:null
    },
    supports: {
      type: String,default:null
    },
    
  },
  {
    timestamps: true,
  }
);

const Contents = mongoose.model("Contents", contentsSchema);
module.exports = Contents;
