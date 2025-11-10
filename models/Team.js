const mongoose = require("mongoose");

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String,default:null}, //  logo is url stored in cloud storage.
  sportsType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SportType",default:null
  },

  players: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",default:null
    },
  ],
  activated: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Team", TeamSchema);
