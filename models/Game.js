const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tournament",
    required: false,
    default: null,
  },

  photo: {
    type: String,
    default: null,
  },

  sportsType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SportType",
    default: null,
  },

  quarterTime: {
    type: Number,
    default: 8,
  },
   playTime: { type: String ,default:null},
  teams: [
    {
      team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
        required: true,
      },
      stats: { type: Map, of: Number, default: null }, // Dynamic key-value pairs for team stats
      teamName: { type: String, default: null },
      teamLogo: { type: String, default: null }, 
      players: [
        {
          player: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Player",
            required: true,
          },
          name: { type: String, required: true },
          position: { type: Number, default: 0 },
          stats: { type: Map, of: Number, default: null }, // Dynamic key-value pairs for player stats
          no: { type: Number, default: null }, 
          isInCourt:{type:Boolean, default:false}
        },
      ],
    },
  ],

  court: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Court",
    required: true,
  },
  courtName: { type: String, default: null },
  gameDate: {
    type: String,
    requierd: true,
  },
  gameTime: {
    type: String,
    requierd: true,
  },
  gameAction: [
    {
      teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
        required: true,
      },
      playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player",
        required: true,
      },
      action: { type: String, required: true },
      time: { type: Date, default: Date.now() },
    },
  ],

  date: {
    type: Date,
    default: Date.now(),default:null
  },

  overTimeStart: {
    type: String,
    default: null,
  },

  isRunning: {
    type: Boolean,
    default: false,
  },
  currentTurn: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    default: "Not progressing",
  },
  undoEnable: {
    type: Boolean,
    default: false,
  },
  details: { type: String, default: null },
}, {timestamps: true});

const Game = mongoose.model("Game", gameSchema);
module.exports = Game;
