const mongoose = require("mongoose");
const { Schema } = mongoose;

const gameResultSchema = new Schema({
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
    required: true,
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tournament",
    required: false,
    default:null
  },
  teamAScore: {
    type: Number,
    default: 0,
  },
  teamBScore: {
    type: Number,
    default: 0,
  },
  winnerTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  looserTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
});

const GameResult = mongoose.model("GameResult", gameResultSchema);
module.exports = GameResult;
