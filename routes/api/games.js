const express = require("express");
const router = express.Router();
const Game = require("../../models/Game");
const Team = require("../../models/Team");
const Tournament = require("../../models/Tournament");
const Court = require("../../models/Court");
const Player = require("../../models/Player");
const { check, validationResult } = require("express-validator");
const SportType = require("../../models/SportType");
// const io = require('../../server');
const auth = require("../../middleware/auth");
const { Types, startSession } = require("mongoose");
const GameResult = require("../../models/GameResult");
const moment = require("moment");

// @route    POST api/games/
// @desc     Create a new game for admin
// @access   Public
router.post(
  "/",
  check("sportsType", "Sports Type is required").notEmpty(),
  check("team1", "Team1 is required").notEmpty(),
  check("team2", "Team2 is required").notEmpty(),
  check("court", "Court is required").notEmpty(),
  check("gameDate", "Game Date is required").notEmpty(),
  check("gameTime", "Game Time is required").notEmpty(),
  auth,
  async (req, res) => {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const payload = req.body;
      // Fetch the sportType by name
      const sportType = await SportType.findOne({ name: payload.sportsType });
      if (!sportType)
        return res.status(404).send({ message: "Sports Type not found" });

      const newTeams = [];
      payload.teams = [
        { team: payload?.team1, stats: new Map(), players: [] },
        { team: payload?.team2, stats: new Map(), players: [] },
      ];

      const court = await Court.findById(payload?.court);
      payload.courtName = court.name;

      for (let team of payload.teams) {
        const teamData = await Team.findById(team.team).populate([
          {
            path: "players",
          },
        ]);

        const newPlayers = [];
        if (teamData?.players) {
          team.players = teamData?.players.map((player) =>
            newPlayers.push({
              player: player?._id,
              name: player?.name,
              position: player?.position ?? null,
            })
          );
        }
        newTeams.push({
          ...team,
          teamName: teamData?.name || "",
          teamLogo: teamData?.logo || "",
          players: newPlayers || [],
        });
      }

      const game = {
        tournamentId: payload?.tournamentId || null,
        photo: payload?.photo,
        sportsType: sportType._id,
        teams: newTeams,
        court: payload?.court,
        details: payload?.details,
        gameDate: payload?.gameDate,
        gameTime: payload?.gameTime,
        courtName: payload?.courtName,
      };
      if (!game.tournamentId) {
        delete game.tournamentId;
      }
      const result = await Game.create(game);
      if (!result) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to create game" });
      }

      if (payload?.tournamentId) {
        // Find the tournament and update its games array
        const tournament = await Tournament.findById(payload?.tournamentId);
        tournament.games.push(result?._id);
        await tournament.save();
      }
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

// @route    GET api/games/:id
// @desc     Get a game by ID
// @access   Public
router?.get("/:id", async (req, res) => {
 
  try {
    const game = await Game.findById(req.params.id).populate({
      path: "teams.players.player",
      select: "no",
    });

    const gameStats = await Game.aggregate([
      // Match the game by its ID
      { $match: { _id: new Types.ObjectId(req?.params.id) } },

      // Unwind the teams array
      { $unwind: "$teams" },

      // Unwind the players array within each team
      { $unwind: "$teams.players" },
      { $unwind: "$teams.stats" },

      // Group by team ID and sum up individual stats for each player
      {
        $group: {
          _id: "$teams.team", // Group by team 
           score: { $first: { $ifNull: ["$teams.stats.SCORE", 0] } },
          teamName: { $first: "$teams.teamName" },
          teamLogo: { $first: "$teams.teamLogo" },
          totalFTM: { $sum: "$teams.players.stats.FTM" },
          totalPlayers: { $sum: 1 },
          totalFTA: { $sum: "$teams.players.stats.FTA" },
          total2PM: { $sum: "$teams.players.stats.2PM" }, // 2PT Made
          total2PA: { $sum: "$teams.players.stats.2PA" }, // 2PT Attempted
          total3PM: { $sum: "$teams.players.stats.3PM" }, // 3PT Made
          total3PA: { $sum: "$teams.players.stats.3PA" }, // 3PT Attempted
          totalPM: { $sum: "$teams.players.stats.PM" },
          totalFGA: { $sum: "$teams.players.stats.FGA" },
          totalFGM: { $sum: "$teams.players.stats.FGM" },
          totalAST: { $sum: "$teams.players.stats.AST" },
          totalTO: { $sum: "$teams.players.stats.TO" },
          totalPF: { $sum: "$teams.players.stats.PF" },
          totalOREB: { $sum: "$teams.players.stats.OREB" },
          totalDREB: { $sum: "$teams.players.stats.DREB" },
          totalBLK: { $sum: "$teams.players.stats.BLK" },
          totalSTL: { $sum: "$teams.players.stats.STL" },
          totalTEMPMIN: { $sum: "$teams.players.stats.TEMPMIN" },
          totalMIN: { $sum: "$teams.players.stats.MIN" },
        },
      },

      // Group the stats once more to ensure totals are aggregated
      {
        $group: {
          _id: "$_id",
          teamName: { $first: "$teamName" },
          teamLogo: { $first: "$teamLogo" },
          totalFTM: { $sum: "$totalFTM" },
          totalFTA: { $sum: "$totalFTA" },
          total2PM: { $sum: "$total2PM" }, // Sum 2PM
          total2PA: { $sum: "$total2PA" }, // Sum 2PA
          total3PM: { $sum: "$total3PM" }, // Sum 3PM
          total3PA: { $sum: "$total3PA" }, // Sum 3PA
          totalPM: { $sum: "$totalPM" },
          totalAST: { $sum: "$totalAST" },
          totalTO: { $sum: "$totalTO" },
          totalPF: { $sum: "$totalPF" },
          totalOREB: { $sum: "$totalOREB" },
          totalDREB: { $sum: "$totalDREB" },
          totalFGA: { $sum: "$totalFGA" }, 
          totalFGM: { $sum: "$totalFGM" },
          totalPlayers: { $sum: "$totalPlayers" },
          score: { $sum: "$score" },
          totalBLK: { $sum: "$totalBLK" },
          totalSTL: { $sum: "$totalSTL" },
          totalTEMPMIN: { $sum: "$totalTEMPMIN" },
          totalMIN: { $sum: "$totalMIN" },
        },
      },
 
      {
        $project: {
          teams:"$teams",
          teamName: 1,
          teamLogo: 1,
          totalPlayers: "$totalPlayers",
          PTS: {$toInt:{
            $round: [
              {
                $add: [
                  { $multiply: ["$total2PM", 2] },
                  { $multiply: ["$total3PM", 3] },
                  "$totalFTM",
                ],
              },
              1,
            ],}
          },
          REB: {$toInt:{
            $round: [{ $add: ["$totalOREB", "$totalDREB"] }, 1],}
          }, 
         
         FG: {$toInt:{
            $round: [
              {
                $cond: {
                  if: { $eq: [{ $add: ["$total2PA", "$total3PA"] }, 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      {
                        $divide: [
                          { $add: ["$total2PM", "$total3PM"] },
                          { $add: ["$total2PA", "$total3PA"] },
                        ],
                      },
                      100,
                    ],
                  },
                },
              },
              1,
            ],}
          },
      
          FG_PERCENTAGE: {$toInt:{
              $round: [
              {
                $cond: [
                  { $eq: ["$totalFGA", 0] },
                   0,
                  { $multiply: [{ $divide: ["$totalFGM", "$totalFGA"] }, 100] }
                ]
                
              },
              1,
            ],}
          },
         
          "2PT_FG": {$toInt:{
            $round: [
              {
                $cond: {
                  if: { $eq: ["$total2PA", 0] },
                  then: 0,
                  else: {
                    $multiply: [{ $divide: ["$total2PM", "$total2PA"] }, 100],
                  },
                },
              },
              1,
            ],}
          },
          "3PT_FG": {$toInt:{
            $round: [
              {
                $cond: {
                  if: { $eq: ["$total3PA", 0] },
                  then: 0,
                  else: {
                    $multiply: [{ $divide: ["$total3PM", "$total3PA"] }, 100],
                  },
                },
              },
              1,
            ],}
          },
              FT_PERCENTAGE:  {$toInt:{
              $round: [
              {
                $cond: [
                  { $eq: ["$totalFTA", 0] },
                   0,
                  { $multiply: [{ $divide: ["$totalFTM", "$totalFTA"] }, 100] }
                ]
                
              },
              1,
            ],}
          },
          "3P_PERCENTAGE":  
              {$toInt:{
              $round: [
              {
                $cond: [
                  { $eq: ["$total3PA", 0] },
                   0,
                  { $multiply: [{ $divide: ["$total3PM", "$total3PA"] }, 100] }
                ]
                
              },
              1,
            ],}
          },
          FT: {$toInt:{
            $round: [
              {
                $cond: {
                  if: { $eq: ["$totalFTA", 0] },
                  then: 0,
                  else: {
                    $multiply: [{ $divide: ["$totalFTM", "$totalFTA"] }, 100],
                  },
                },
              },
              1,
            ],}
          },
          
          OREB: {$toInt:{
            $cond: {
              if: { $eq: ["$totalOREB", null] }, // optional check for null
              then: 0,
              else: "$totalOREB",
            },}
          }, 
          DREB: {$toInt:{
            $cond: {
              if: { $eq: ["$totalDREB", null] }, // optional check for null
              then: 0,
              else: "$totalDREB",
            },}
          },
          AST: "$totalAST",
          TO: "$totalTO",
          PF: "$totalPF",
          BLK: "$totalBLK",
          STL: "$totalSTL",
          PM: "$totalPM",
          MIN: {$toInt:"$totalMIN"},
        },
      },
    ]);
    const sportType = await SportType.findById(game.sportsType);

    if (!game) return res.status(404).send({ message: "Game not found" });
    res.status(200).json({
      game: {
        ...game._doc,
        gameStats: gameStats,
        sportsType: sportType.name,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
});


router?.get("/", auth, async (req, res) => {
  try {
    const pageSize = parseInt(req.query.size) || 15; // Number of players per page
    const page = parseInt(req.query.page) || 1; // Current page
    const search = req.query.search || ""; // Search query

    // Fetch the sportType by ID
    const sportType = await SportType.findOne({ name: req.query.sportsType });
    if (!sportType)
      return res.status(404).send({ message: "Sports Type not found" });

    // Build the query
    const query = {
      sportsType: sportType._id,
      // activated: true,
    };
    // if (search) {
    //   query["courtName"] = { $regex: search, $options: "i" };
    // }
    if (req.query.gameDate) {
      query.gameDate = req.query.gameDate;
    }
    const count = await Game.countDocuments(query);
    const games = await Game.find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    res.send({
      games: games.map((game) => ({
        ...game._doc,
        sportsType: req.query.sportsType,
      })),
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      pageSize,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route    POST api/games/id
// @desc     Update game state
// @access   Public

router.patch("/:id", auth, async (req, res) => {
  try {
    if (req.query.sportsType) {
      const sportType = await SportType.findOne({ name: req.query.sportsType });
      if (!sportType)
        return res.status(404).send({ message: "Sports Type not found" });
      req.query.sportsType = sportType._id;
    }
    const updatedGame = await Game.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    const io = req.app?.get("io");
    // io.emit('updateGame', req.params.id); // Notify all clients about game update
    io.emit("updateGame", updatedGame); // Notify all clients about game update
    res.status(200).json(updatedGame);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route    POST api/games/player/:gameId/:teamId/:playerId
// @desc     Add a player to a game
// @access   Public
router.post("/player/:gameId/:teamId/:playerId", auth, async (req, res) => {
  try {
         const { gameId, teamId, playerId } = req.params; 
    const position = req.body.position;
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

     // Check if team exists in the game
    const team = game.teams.find(
      (t) => t.team.toString() === teamId
    );
    if (!team) {
      return res.status(404).json({ message: "Team not found in this game" });
    }



    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }
   
 const updatedGame = await Game.updateOne(
      {
        _id: gameId,
        "teams.team": teamId,
        "teams.players.player": playerId,
      },
      {
        $set: {
          "teams.$[team].players.$[player].isInCourt": true,
          "teams.$[team].players.$[player].position": position,
        },
      },
      {
        arrayFilters: [
          { "team.team": teamId },
          { "player.player": playerId },
        ],
        new: true,
      }
    ); 
    // team.players.push({
    //   player: playerId,
    //   name: player.name,
    //   position: position,
    //   stats: value,
    // });
    // await game.save();
    const io = req.app?.get("io");
    // io.emit("updateGame", req.params.gameId);
    io.emit("updateGame", updatedGame); // Notify all clients about game update
    res.status(200).json(updatedGame);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route    DELETE api/games/player/:gameId/player/:playerId
// @desc     Remove a player from a game
// @access   Public
router.delete("/player/:gameId/:teamId/:playerId", auth, async (req, res) => {
  try {
      const { gameId, teamId, playerId } = req.params;
     const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

     // Check if team exists in the game
    const team = game.teams.find(
      (t) => t.team.toString() === teamId
    );
    if (!team) {
      return res.status(404).json({ message: "Team not found in this game" });
    }

    // Update player's isInCourt field using array filters
    const updatedGame = await Game.updateOne(
      {
        _id: gameId,
        "teams.team": teamId,
        "teams.players.player": playerId,
      },
      {
        $set: {
          "teams.$[team].players.$[player].isInCourt": false,
        },
      },
      {
        arrayFilters: [
          { "team.team": teamId },
          { "player.player": playerId },
        ],
        new: true,
      }
    ); 

    const io = req.app?.get("io");
    io.emit("updateGame", updatedGame);  
    res.status(200).json(updatedGame);
  } catch (error) {
    console.log(error)
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await Game.findByIdAndDelete(req.params.id);
    if (!result) {
      throw res.status(400).json({
        success: false,
        message: error?.message || "Game Deletion failed",
      });
    }
    res.status(200).json({
      success: true,
      data: result,
      message: "Game successfully deleted",
    });
  } catch (error) {
    throw res.status(400).json({
      success: false,
      message: error?.message || "Game Deletion failed",
    });
  }
});

// Middleware function to save player stats
async function savePlayerStats(playerId, gameId, stats) {
  const player = await Player.findById(playerId);
  if (!player) {
    throw new Error("Player not found");
  }
  let f = 0;
  // Check if the game exists in the player's stats
  const gameIndex = player.stats.forEach((game) => {
    if (game.gameId.toString() === gameId.toString()) {
      game.stats = stats;
      f = 1;
    }
  });
  if (f === 0) {
    player.stats.push({ gameId, stats });
  }
  await player.save();
}

// @route    POST api/games/timeout/:gameId/:teamId
// @desc     Add a timeout for a team
// @access   Public
router.post("/timeout/:gameId/:teamId", auth, async (req, res) => {
  const { teamId } = req.params;

  try {
    const game = await Game.findById(req.params.gameId);
    if (!game) {
      return res.status(404).send({ message: "Game not found" });
    }

    const team = game.teams.find((stat) => stat.team.toString() === teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found in this game" });
    }

    // Increment timeout count
    team.stats?.set("timeout", (team.stats?.get("timeout") || 0) + 1);

    // Stop the game
    game.isRunning = false;

    game.teams.forEach((team) => {
      team.players.forEach((player) => {
        const startTime = player.stats?.get("startTime");

        if (startTime) {
          const startMoment = moment(startTime);
          const now = moment();

          if (startMoment.isValid()) {
            const minutes = now.diff(startMoment, "minutes");
            const prevMinutes = Number(player.stats?.get("MIN") || 0);

            player.stats?.set("MIN", prevMinutes + minutes);
          } else {
            player.stats?.set("MIN", 0); // fallback
          }
        }
      });
    });

    await game.save();

    const io = req.app?.get("io");
    if (io) {
      io.emit("updateGame", game); // Notify all clients
    }

    res.status(200).json(game);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});

// @route    POST api/games/timer/:gameId
// @desc     Start/pause/resume/increase/decrease the timer
// @access   Public
router.post("/timer/:gameId", auth, async (req, res) => {
  try {
    const { action, quarter } = req.body;
    const game = await Game.findById(req.params.gameId);

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    game.status = "Running"; 
    switch (action) {
      case "play":
        game.isRunning = true;
        game.currentTurn = quarter;
        game.playTime = moment().toISOString(); 
        break;

      case "stop":
        game.isRunning = false;
        game.teams.forEach((team) => {
          team.players.forEach((player) => {
            const startTime = game.playTime 

            if (startTime) {
              const startMoment = moment(startTime); 
              const endMoment = moment();
              const diffInMs = endMoment.diff(startMoment);
              const minutes = (diffInMs / (1000 * 60)).toFixed(2); 
            //  const minutes = endMoment.diff(startMoment, "minutes");
                const prevMinutes = Number(player.stats?.get("MIN") || 0);
                const totalTime = Number(prevMinutes) + Number(minutes)
                console.log("🚀 ~ totalTime:", totalTime)

                player.stats?.set("MIN",totalTime);
             
            }
          });
        });
        break;

      case "resume":
        game.isRunning = true;
        game.playTime = moment().toISOString(); 
        break;

      case "increase":
        game.quarterTime = (game.quarterTime || 0) + 1;
        break;

      case "decrease":
        game.quarterTime = Math.max((game.quarterTime || 0) - 1, 0);
        break;
    } 
    await game.save();

    const io = global.socketio;
    if (io) {
      io.emit("updateGame", game);
    }

    res.status(200).json(game);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});

//---------------------------------------------------------------------------Over Time---------------------------------------------------------//
router.post("/overtime/:id", auth, async (req, res) => {
  try { 
    const game = await Game.findByIdAndUpdate(req.params.id, {overTimeStart: moment().toISOString()},{new:true, upsert:false});
    if (!game) {
      return res.status(404).json({success:false, message: "Game not found" });
    }
    return res.status(200).send({success:true, message: "Overtime started successfully", game});

  } catch (error) {
    return res.status(404).json({success:false, message: error?.message ?? "Game Creation Failed!" });
  }
})
// router.post("/otTime")
// @route    POST api/games/finish/:gameId
// @desc     Finish the game
// @access   Public
router.post("/finish/:gameId", auth, async (req, res) => {
  const session = await startSession();
  session.startTransaction();
  try {

    const game = await Game.findById(req.params.gameId).session(session);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Iterate over the teams and players to update player stats
    for (const team of game.teams) {
      for (const player of team.players) {
        const startTime = moment(player.stats?.get("startTime"));
        const endTime = moment(); 
        const minutes = endTime.diff(startTime, "minutes");
        if (!isNaN(minutes)) {
          player.stats?.set("MIN", (player.stats?.get("MIN") || 0) + minutes);
        } else {
          player.stats?.set("MIN", 0); // Default to 0 if minutes calculation fails
        }

          if(game?.overTimeStart) {
          const ot = moment(game.overTimeStart);
          const OverTime =  endTime.diff(ot, "minutes")
          const oldOverTime = team.stats?.get("OT") || 0;
          team.stats.set("OT", oldOverTime + OverTime); 
        }
        await savePlayerStats(player.player, game._id, player.stats, session); // Pass session for transaction
      }
    }

    // Reset game state
    game.isRunning = false;
    game.status = "Finished";
    await game.save({ session });

    let looserTeamId, winnerTeamId;
    const teamA = game.teams[0];
    const teamB = game.teams[1];
    const team1Score = teamA.stats.get("SCORE") || 0;
    const team2Score = teamB.stats.get("SCORE") || 0;

    if (team1Score > team2Score) {
      looserTeamId = teamB.team;
      winnerTeamId = teamA.team;
    } else if (team2Score > team1Score) {
      looserTeamId = teamA.team;
      winnerTeamId = teamB.team;
    }
    const data = {
      gameId: game._id,
      teamAScore: teamA.stats.get("SCORE") || 0,
      teamBScore: teamB.stats.get("SCORE") || 0,
      tournamentId: game.tournamentId,
      winnerTeamId,
      looserTeamId,
    };
    if (!game.tournamentId) {
      delete data.tournamentId;
    }

    await GameResult.create([data], { session });

    const io = global.socketio;
    if (io) {
      io.emit("updateGame", game);
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Broadcast updated game to all clients
    res.status(200).json(game);
  } catch (error) {
    console.error(error);

    // If any error occurs, rollback the transaction
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    res.status(400).json({ message: error.message });
  }
});


router.patch("/status/:gameId/:teamId/:playerId", auth, async (req, res) => {
  try {
    const { gameId, teamId, playerId } = req.params;
    const { action } = req.body;

    // Find game, player, and team
    const game = await Game.findById(gameId);
    if (!game) return res.status(404).json({ message: "Game not found" });

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: "Player not found" });

    const team = game.teams.find((team) => team.team.toString() === teamId);
    if (!team)
      return res.status(404).json({ message: "Team not found in this game" });

    const playerStat = team.players.find(
      (p) => p.player.toString() === playerId
    );
    if (!playerStat)
      return res.status(404).json({ message: "Player not found in this team" });

    // Ensure playerStat.stats is initialized
    if (!playerStat.stats) {
      playerStat.stats = new Map();
    }

    // Calculate player time on court efficiently
    const startTime = new Date(playerStat.stats?.get("startTime"));
    if (!isNaN(startTime.getTime())) {
      // Ensure startTime is valid
      const minutes = Math.floor((Date.now() - startTime) / 1000 / 60);
      playerStat.stats.set(
        "TEMPMIN",
        (playerStat.stats.get("MIN") || 0) + minutes
      );
    }

    // Function to update stat percentages
    const updateStatPercentage = (
      playerStat,
      madeKey,
      attemptKey,
      percentKey,
      missed = 0
    ) => {
      updatePlayerStat(playerStat, attemptKey, missed); // Add a missed attempt
      const made = playerStat.stats.get(madeKey) || 0;
      const attempts = playerStat.stats.get(attemptKey) || 0;
      const percentage =
        attempts > 0 ? ((made / attempts) * 100).toFixed(2) : 0;
      playerStat.stats.set(percentKey, percentage);
    };

    // Define action updates
    const actionUpdates = {
      point1: () => {
        updatePlayerStat(playerStat, "FTM", 1);
        updatePlayerStat(playerStat, "FTA", 1);
        updatePlayerStat(playerStat, "PTS", 1);
        updateStatPercentage(playerStat, "FTM", "FTA", "FT_PERCENT");
        updateTeamScore(team, game, 1);
        updatePlayerPlusMinus(team, game, teamId, 1);
      },
      point2: () => {
        updatePlayerStat(playerStat, "FGM", 1);
        updatePlayerStat(playerStat, "FGA", 1);
        updatePlayerStat(playerStat, "PTS", 2);
        updateStatPercentage(playerStat, "FGM", "FGA", "FG_PERCENT");
        updateTeamScore(team, game, 2);
        updatePlayerPlusMinus(team, game, teamId, 2);
      },
      point3: () => {
        updatePlayerStat(playerStat, "3PM", 1);
        updatePlayerStat(playerStat, "3PA", 1);
        updatePlayerStat(playerStat, "PTS", 3);
        updateStatPercentage(playerStat, "3PM", "3PA", "3P_PERCENT");
        updateTeamScore(team, game, 3);
        updatePlayerPlusMinus(team, game, teamId, 3);
      },
      miss1: () =>
        updateStatPercentage(playerStat, "FTM", "FTA", "FT_PERCENT", 1),
      miss2: () =>
        updateStatPercentage(playerStat, "FGM", "FGA", "FG_PERCENT", 1),
      miss3: () =>
        updateStatPercentage(playerStat, "3PM", "3PA", "3P_PERCENT", 1),
      AST: () => updatePlayerStat(playerStat, "AST", 1),
      TO: () => updatePlayerStat(playerStat, "TO", 1),
      FOUL: () => updatePlayerStat(playerStat, "PF", 1),
      REB_OFEN: () => {
        updatePlayerStat(playerStat, "OREB", 1);
        updatePlayerStat(playerStat, "REB", 1);
      },
      REB_DEFE: () => {
        updatePlayerStat(playerStat, "DREB", 1);
        updatePlayerStat(playerStat, "REB", 1);
      },
      BLK: () => updatePlayerStat(playerStat, "BLK", 1),
      STL: () => updatePlayerStat(playerStat, "STL", 1),
    };

    if (actionUpdates[action]) {
      actionUpdates[action]();
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    // Update game actions history
    game.undoEnable = true;
    game.gameAction.push({ teamId, playerId, action });

    await game.save();

    // Emit socket event
    if (global.socketio) {
      global.socketio.emit("updateGame", game);
    }

    res.status(200).json(game);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// Utility functions
const updatePlayerStat = (playerStat, key, value) => {
  playerStat.stats?.set(key, (playerStat.stats?.get(key) || 0) + value);
};

const updateStatPercentage = (
  playerStat,
  madeKey,
  attemptKey,
  percentKey,
  increment = 0
) => {
  updatePlayerStat(playerStat, attemptKey, increment);
  const made = playerStat.stats?.get(madeKey) || 0;
  const attempt = playerStat.stats?.get(attemptKey) || 0;
  playerStat.stats.set(
    percentKey,
    attempt > 0 ? ((made / attempt) * 100).toFixed(2) : "0.00"
  );
};

const updateTeamScore = (team, game, points) => {
  team.stats.set(
    `Q${game.currentTurn}`,
    (team.stats.get(`Q${game.currentTurn}`) || 0) + points
  );
  team.stats?.set("SCORE", (team.stats?.get("SCORE") || 0) + points);
};

const updatePlayerPlusMinus = (team, game, teamId, points) => {
  team.players.forEach((p) => updatePlayerStat(p, "PM", points));
  game.teams.forEach((opponentTeam) => {
    if (opponentTeam.team.toString() !== teamId) {
      opponentTeam.players.forEach((opponentPlayer) =>
        updatePlayerStat(opponentPlayer, "PM", -points)
      );
    }
  });
};

router.post("/undo/:gameId", auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);
    if (!game) return res.status(404).json({ message: "Game not found" });

    if (!game.undoEnable)
      return res.status(400).json({ message: "Undo is not allowed" });

    if (game.gameAction.length === 0)
      return res.status(400).json({ message: "No actions to undo" });

    const lastAction = game.gameAction.pop(); // Remove last action
    const { playerId, teamId, action } = lastAction;

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: "Player not found" });

    const team = game.teams.find(
      (t) => t.team.toString() === teamId.toString()
    );
    if (!team)
      return res.status(404).json({ message: "Team not found in this game" });

    const playerStat = team.players.find(
      (p) => p.player.toString() === playerId.toString()
    );
    if (!playerStat)
      return res.status(404).json({ message: "Player not found in this team" });

    // Handle TEMPMIN with moment.js
    if (game.gameAction.length > 0) {
      const lastActionTime = moment(
        game.gameAction[game.gameAction.length - 1].time
      );

      game.teams.forEach((team) => {
        team.players.forEach((player) => {
          const start = moment(player.stats?.get("startTime"));
          const minutes = lastActionTime.diff(start, "minutes");
          const currentMin = player.stats?.get("MIN") || 0;
          player.stats?.set("TEMPMIN", currentMin + minutes);
        });
      });
    } else {
      game.teams.forEach((team) => {
        team.players.forEach((player) => {
          player.stats?.set("TEMPMIN", player.stats?.get("MIN") || 0);
        });
      });
    }

    // Undo Action Logic (unchanged except using Math.max for safety)
    switch (action) {
      case "point1":
        playerStat.stats.set(
          "FTM",
          Math.max(0, playerStat.stats.get("FTM") - 1)
        );
        playerStat.stats.set(
          "FTA",
          Math.max(0, playerStat.stats.get("FTA") - 1)
        );
        playerStat.stats.set(
          "PTS",
          Math.max(0, playerStat.stats.get("PTS") - 1)
        );
        team.stats.set(
          `Q${game.currentTurn}`,
          Math.max(0, team.stats.get(`Q${game.currentTurn}`) - 1)
        );
        team.stats.set("SCORE", Math.max(0, team.stats.get("SCORE") - 1));
        playerStat.stats.set("PM", Math.max(0, playerStat.stats.get("PM") - 1));
        team.players.forEach((tp) =>
          tp.stats.set("PM", Math.max(0, tp.stats.get("PM") - 1))
        );
        game.teams.forEach((opp) => {
          if (opp.team.toString() !== teamId.toString()) {
            opp.players.forEach((p) =>
              p.stats.set("PM", (p.stats.get("PM") || 0) + 1)
            );
          }
        });
        break;

      case "point2":
        playerStat.stats.set(
          "FGM",
          Math.max(0, playerStat.stats.get("FGM") - 1)
        );
        playerStat.stats.set(
          "FGA",
          Math.max(0, playerStat.stats.get("FGA") - 1)
        );
        playerStat.stats.set(
          "PTS",
          Math.max(0, playerStat.stats.get("PTS") - 2)
        );
        team.stats.set(
          `Q${game.currentTurn}`,
          Math.max(0, team.stats.get(`Q${game.currentTurn}`) - 2)
        );
        team.stats.set("SCORE", Math.max(0, team.stats.get("SCORE") - 2));
        playerStat.stats.set("PM", Math.max(0, playerStat.stats.get("PM") - 2));
        break;

      case "point3":
        playerStat.stats.set(
          "3PM",
          Math.max(0, playerStat.stats.get("3PM") - 1)
        );
        playerStat.stats.set(
          "3PA",
          Math.max(0, playerStat.stats.get("3PA") - 1)
        );
        playerStat.stats.set(
          "PTS",
          Math.max(0, playerStat.stats.get("PTS") - 3)
        );
        team.stats.set(
          `Q${game.currentTurn}`,
          Math.max(0, team.stats.get(`Q${game.currentTurn}`) - 3)
        );
        team.stats.set("SCORE", Math.max(0, team.stats.get("SCORE") - 3));
        playerStat.stats.set("PM", Math.max(0, playerStat.stats.get("PM") - 3));
        break;

      case "miss1":
        playerStat.stats.set(
          "FTA",
          Math.max(0, playerStat.stats.get("FTA") - 1)
        );
        const fta = playerStat.stats.get("FTA") || 1;
        playerStat.stats.set(
          "FT_PERCENT",
          ((playerStat.stats.get("FTM") / fta) * 100).toFixed(2)
        );
        break;

      case "miss2":
        playerStat.stats.set(
          "FGA",
          Math.max(0, playerStat.stats.get("FGA") - 1)
        );
        const fga = playerStat.stats.get("FGA") || 1;
        playerStat.stats.set(
          "FG_PERCENT",
          ((playerStat.stats.get("FGM") / fga) * 100).toFixed(2)
        );
        break;

      case "miss3":
        playerStat.stats.set(
          "3PA",
          Math.max(0, playerStat.stats.get("3PA") - 1)
        );
        const threePA = playerStat.stats.get("3PA") || 1;
        playerStat.stats.set(
          "3P_PERCENT",
          ((playerStat.stats.get("3PM") / threePA) * 100).toFixed(2)
        );
        break;

      case "AST":
        playerStat.stats.set(
          "AST",
          Math.max(0, playerStat.stats.get("AST") - 1)
        );
        break;

      case "TO":
        playerStat.stats.set("TO", Math.max(0, playerStat.stats.get("TO") - 1));
        break;

      case "FOUL":
        playerStat.stats.set("PF", Math.max(0, playerStat.stats.get("PF") - 1));
        break;

      case "REB_OFEN":
        playerStat.stats.set(
          "OREB",
          Math.max(0, playerStat.stats.get("OREB") - 1)
        );
        playerStat.stats.set(
          "REB",
          Math.max(0, playerStat.stats.get("REB") - 1)
        );
        break;

      case "REB_DEFE":
        playerStat.stats.set(
          "DREB",
          Math.max(0, playerStat.stats.get("DREB") - 1)
        );
        playerStat.stats.set(
          "REB",
          Math.max(0, playerStat.stats.get("REB") - 1)
        );
        break;

      case "BLK":
        playerStat.stats.set(
          "BLK",
          Math.max(0, playerStat.stats.get("BLK") - 1)
        );
        break;

      case "STL":
        playerStat.stats.set(
          "STL",
          Math.max(0, playerStat.stats.get("STL") - 1)
        );
        break;
    }

    game.undoEnable = false;
    await game.save();

    res.status(200).json(game);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
