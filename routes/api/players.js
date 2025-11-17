const express = require("express");
const router = express.Router();
const Player = require("../../models/Player");
const Team = require("../../models/Team");
const SportType = require("../../models/SportType");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const cron = require("node-cron");
const moment = require("moment");
const { default: mongoose } = require("mongoose");
const Game = require("../../models/Game");

// @route    POST api/players/
// @desc     Create a new player for admin
// @access   Public

// @route    GET api/players/
// @desc     Get all activated players for admin
// @access   Public
router.get("/", async (req, res) => {
  try {
    const pageSize = parseInt(req.query.size) || 15; // Number of players per page
    const page = parseInt(req.query.page) || 1; // Current page
    const search = req.query.search || ""; // Search query
    // Fetch the sportType by ID
    const sportType = await SportType.findOne({ name: req.query.sportsType });

    if (!sportType)
      return res.status(404).json({ message: "Sports Type not found" });

    // Build the query
    const query = {
      sportsType: sportType._id,
      activated: true,
      name: { $regex: search, $options: "i" }, // Search by name
    };

    if (req.query.createdAt) {
      const startOfDay = moment(req.query.createdAt).startOf("day").toDate();
      const endOfDay = moment(req.query.createdAt).endOf("day").toDate();
      query.createdAt = {
        $gte: startOfDay,
        $lt: endOfDay,
      };
    }

    const count = await Player.countDocuments(query);

    const players = await Player.find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("teamId");

    res.send({
      players: players.map((player) => ({
        ...player._doc,
        teamName: player?.teamId?.name, // Fetch the team name from the related team document
        sportsType: req?.query?.sportsType,
      })),
      total:count,
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      pageSize,
    });
  } catch (error) {
    res.status(500).send({ message: error?.message });
  }
});

router.get("/details/:id", async (req, res) => {
  try {
    console.log(req.params)
    // Fetch player by ID and populate necessary fields
    const player = await Player.findById(req.params.id)
    .populate("teamId")
    .populate("sportsType"); 

    // If player doesn't exist, return 404
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Fetch the player's stats
    const stats = player.stats.map((stat) => ({
      gameId: stat.gameId,
      stats: stat.stats,
      date: stat.date,
    })); 
 
    // Prepare detailed player info
    const detailedPlayer = {
      name: player.name,
      photo: player.photo,
      no: player.no,
      country: player.country,
      dateOfBirth: player.dateOfBirth,
      height: player.height,
      weight: player.weight,
      activated: player.activated,
      teamName: player.teamId.name, // Populate team name
      sportsType: player.sportsType.name, // Populate sport type
      stats: stats, // Include player stats 
    };

    res.status(200).json(detailedPlayer);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// @route    GET api/players/:id
// @desc     Get a player by ID for admin
// @access   Public
router.get("/:id", async (req, res) => {
  try { 
    const player = await Player.findById(req.params.id)
    console.log(player)
    const result = await Player.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(req.params.id) }, // Filter by player ID
      },
      {
    $sort: {
      createdAt: -1,
    },},

    {
    $limit: 5,
  },
      {
        $unwind: "$stats", // Flatten stats array
      },
      {
        $lookup: {
          from: "games",
          localField: "stats.gameId", // Lookup gameId inside stats
          foreignField: "_id",
          as: "gameDetails",
        },
      },
      {
        $addFields: {
          "stats.gameId": { $arrayElemAt: ["$gameDetails", 0] }, // Extract first matched game details
        },
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          photo: { $first: "$photo" },
          teamId: { $first: "$teamId" },
          sportsType: { $first: "$sportsType" },
          country: { $first: "$country" },
          dateOfBirth: { $first: "$dateOfBirth" },
          height: { $first: "$height" },
          weight: { $first: "$weight" },
          activated: { $first: "$activated" },
          stats: { $push: "$stats" }, // Reconstruct stats array with game details
        },
      },
      {
        $facet: {
          stats: [
            { $unwind: "$stats" }, // Unwind stats again for calculations
            {
              $group: {
                _id: "$_id",
                totalPoints: { $sum: "$stats.stats.PTS" },
                totalRebounds: { $sum: "$stats.stats.REB" },
                totalSteals: { $sum: "$stats.stats.STL" },
                totalTurnovers: { $sum: "$stats.stats.TO" },
                totalBlocks: { $sum: "$stats.stats.BLK" },
                gameCount: { $sum: 1 }, // Count number of games
              },
            },
            {
              $project: {
                _id: 0,
                PPG: {
                  $round: [{ $divide: ["$totalPoints", "$gameCount"] }, 2],
                }, // Points Per Game
                RPG: {
                  $round: [{ $divide: ["$totalRebounds", "$gameCount"] }, 2],
                }, // Rebounds Per Game
                STL: {
                  $round: [{ $divide: ["$totalSteals", "$gameCount"] }, 2],
                }, // Steals Per Game
                TO: {
                  $round: [{ $divide: ["$totalTurnovers", "$gameCount"] }, 2],
                }, // Turnovers Per Game
                BLK: {
                  $round: [{ $divide: ["$totalBlocks", "$gameCount"] }, 2],
                }, // Blocks Per Game
              },
            },
          ],
          playerDetails: [
            {
              $project: {
                _id: 1,
                name: 1,
                photo: 1,
                teamId: 1,
                sportsType: 1,
                country: 1,
                dateOfBirth: 1,
                height: 1,
                weight: 1,
                activated: 1,
                stats: 1, // Include stats with game details
              },
            },
          ],
        },
      },
    ]);
    
    
        const gameStats = await Game.aggregate([
      // Match the game by its ID
      { $match: {"teams.players.player": new mongoose.Types.ObjectId(req?.params.id) } },
 
      { $unwind: "$teams" },

      // Unwind the players array within each team
      { $unwind: "$teams.players" },

      // Group by team ID and sum up individual stats for each player
      {
        $group: {
          _id: "$teams.team", // Group by team
          teamName: { $first: "$teams.teamName" },
          teamLogo: { $first: "$teams.teamLogo" },
          totalFTM: { $sum: "$teams.players.stats.FTM" },
          totalFTA: { $sum: "$teams.players.stats.FTA" },
          total2PM: { $sum: "$teams.players.stats.2PM" }, // 2PT Made
          total2PA: { $sum: "$teams.players.stats.2PA" }, // 2PT Attempted
          total3PM: { $sum: "$teams.players.stats.3PM" }, // 3PT Made
          total3PA: { $sum: "$teams.players.stats.3PA" }, // 3PT Attempted
          totalPM: { $sum: "$teams.players.stats.PM" },
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
          totalBLK: { $sum: "$totalBLK" },
          totalSTL: { $sum: "$totalSTL" },
          totalTEMPMIN: { $sum: "$totalTEMPMIN" },
          totalMIN: { $sum: "$totalMIN" },
        },
      },

      // Calculate derived stats based on formulas
      {
        $project: {
          teamName: 1,
          teamLogo: 1,
          PTS: {
            $round: [
              {
                $add: [
                  { $multiply: ["$total2PM", 2] },
                  { $multiply: ["$total3PM", 3] },
                  "$totalFTM",
                ],
              },
              1,
            ],
          },
          REB: {
            $round: [{ $add: ["$totalOREB", "$totalDREB"] }, 1],
          },
          FG: {
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
            ],
          },
          "2PT_FG": {
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
            ],
          },
          "3PT_FG": {
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
            ],
          },
          FT: {
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
            ],
          },
          // // only count
          // OREB: {
          //   $round: [
          //     {
          //       $cond: {
          //         if: { $eq: ["$totalREB", 0] },
          //         then: 0,
          //         else: {
          //           $multiply: [{ $divide: ["$totalOREB", "$totalREB"] }, 100],
          //         },
          //       },
          //     },
          //     1,
          //   ],
          // },
          //  // only count
          // DREB: {
          //   $round: [
          //     {
          //       $cond: {
          //         if: { $eq: ["$totalREB", 0] },
          //         then: 0,
          //         else: {
          //           $multiply: [{ $divide: ["$totalDREB", "$totalREB"] }, 100],
          //         },
          //       },
          //     },
          //     1,
          //   ],
          // },

          OREB: {
            $cond: {
              if: { $eq: ["$totalOREB", null] }, // optional check for null
              then: 0,
              else: "$totalOREB",
            },
          }, 
          DREB: {
            $cond: {
              if: { $eq: ["$totalDREB", null] }, // optional check for null
              then: 0,
              else: "$totalDREB",
            },
          },
          AST: 1,
          TO: 1,
          PF: 1,
          BLK: 1,
          STL: 1,
          PM: 1,
          MIN: 1,
        },
      },
    ]);
    
    
    
    const data = {
      lastFiveGames:gameStats,
      ...result[0].playerDetails[0],
      ...result[0].stats[0],
    };



    res.status(200).send(data);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

// @route    GET api/players/teams/:id
// @desc     Get a player by ID for admin
// @access   Public
router.get("/teams/:teamId", auth, async (req, res) => {
  try {
    const players = await Player.find({ teamId: req.params.teamId });
    if (!players) return res.status(404).send();
    res.send(players);
    console.log(players.length);
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    PATCH api/players/:id
// @desc     Update a player by ID for admin
// @access   Public
router.patch("/:id", auth, async (req, res) => {
  try {
    if (req.body.sportsType) {
      const sportType = await SportType.findOne({ name: req.body.sportsType });
      if (!sportType)
        return res.status(404).send({ message: "Sports Type not found" });
      req.body.sportsType = sportType._id;
    }
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!player) return res.status(404).send({ message: "Player not found" });
    res.send(player);
  } catch (error) {
    res.status(400).send(error);
  }
});

// @route    DELETE(INACTIVE) api/players/:id
// @desc     Delete(Inactive) a player by ID for admin
// @access   Public
router.delete("/:id", auth, async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { activated: false },
      { new: true }
    );
    const team = await Team.findById(player.teamId);
    if (!team || !player) return res.status(404).send();
    // Remove the player from the team's players array
    team.players = team.players.filter(
      (id) => id.toString() !== player._id.toString()
    );
    await team.save();
    res.send(player);
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    GET api/players/best-of-week
// @desc     Get the best 5 players of the last week
// @access   Public
router.get("/best/week", auth, async (req, res) => {
  try {
    const bestPlayers = await getBestPlayersOfWeek();
    res.json(bestPlayers);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Function to get the best players of the week
async function getBestPlayersOfWeek() {
  // Start of current week (Monday 00:00:00)
  const weekStart = moment().startOf("isoWeek").toDate();

  // Start of next week (next Monday 00:00:00)
  const weekEnd = moment(weekStart).add(7, "days").toDate();

  const players = await Player.aggregate([
    { $unwind: "$stats" },
    {
      $match: {
        "stats.date": {
          $gte: weekStart,
          $lt: weekEnd,
        },
      },
    },
    {
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        gameId: { $first: "$stats.gameId" },
        photo: { $first: "$photo" },
        sportsType: { $first: "$sportsType" },
        totalPoints: { $sum: "$stats.stats.PTS" },
        totalRebounds: {
          $sum: { $add: ["$stats.stats.OREB", "$stats.stats.DREB"] },
        },
        totalAssists: { $sum: "$stats.stats.AST" },
        totalSteals: { $sum: "$stats.stats.STL" },
        totalBlocks: { $sum: "$stats.stats.BLK" },
        totalFGM: { $sum: "$stats.stats.FGM" },
        totalFGA: { $sum: "$stats.stats.FGA" },
        gamesPlayed: { $sum: 1 },
      },
    },
    {
      $project: {
        name: 1,
        sportsType: 1,
        gameId: 1,
        photo: 1,
        PPG: { $round: [{ $divide: ["$totalPoints", "$gamesPlayed"] }, 1] },
        RPG: { $round: [{ $divide: ["$totalRebounds", "$gamesPlayed"] }, 1] },
        APG: { $round: [{ $divide: ["$totalAssists", "$gamesPlayed"] }, 1] },
        STL: { $round: [{ $divide: ["$totalSteals", "$gamesPlayed"] }, 1] },
        score: {
          $add: [
            { $multiply: [{ $divide: ["$totalPoints", "$gamesPlayed"] }, 0.3] },
            {
              $multiply: [{ $divide: ["$totalRebounds", "$gamesPlayed"] }, 0.2],
            },
            {
              $multiply: [{ $divide: ["$totalAssists", "$gamesPlayed"] }, 0.15],
            },
            { $multiply: [{ $divide: ["$totalSteals", "$gamesPlayed"] }, 0.1] },
            { $multiply: [{ $divide: ["$totalBlocks", "$gamesPlayed"] }, 0.1] },
            {
              $multiply: [
                {
                  $cond: [
                    { $eq: ["$totalFGA", 0] },
                    0,
                    { $divide: ["$totalFGM", "$totalFGA"] },
                  ],
                },
                0.1,
              ],
            },
          ],
        },
      },
    },
    {
      $sort: { score: -1 },
    },
    {
      $limit: 5,
    },
    {
      $lookup: {
        from: "games",
        localField: "gameId",
        foreignField: "_id",
        as: "gameId",
      },
    },
    {
      $lookup: {
        from: "sporttypes",
        localField: "sportsType",
        foreignField: "_id",
        as: "sportsTypeInfo",
      },
    },
    {
      $project: {
        name: 1,
        photo: 1,
        gameId: { $arrayElemAt: ["$gameId", 0] },
        PPG: 1,
        RPG: 1,
        APG: 1,
        STL: 1,
        sportsType: { $arrayElemAt: ["$sportsTypeInfo.name", 0] },
      },
    },
  ]);

  return players;
}

router.post(
  "/",
  check("sportsType", "Sports Type is required").notEmpty(),
  check("name", "Player Name is required").notEmpty(),
  check("no", "Player No is required").notEmpty(),
  check("teamId", "Playing team name is required").notEmpty(),
  check("country", "Country is required").notEmpty(),
  check("dateOfBirth", "Date of birth is required").notEmpty(),
  check("height", "Height is required").notEmpty(),
  check("weight", "Pound is required").notEmpty(),
  auth,
  async (req, res) => {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      // const lastFiveGames = req.body.lastFiveGames;

      // Fetch the sportType by name
      const sportType = await SportType.findOne({ name: req.body.sportsType });
      if (!sportType)
        return res.status(404).send({ message: "Sports Type not found" });

      const player = new Player({
        photo: req.body.photo,
        sportsType: sportType._id,
        name: req.body.name,
        teamId: req.body.teamId,
        no: req.body.no,
        country: req.body.country,
        dateOfBirth: req.body.dateOfBirth,
        details: req.body.details,
        height: req.body.height,
        weight: req.body.weight,
        activated: true,
        // lastFiveGames: lastFiveGames // Assign the received lastFiveGames to the player object
      });

      await player.save();

      // Find the team by teamId
      const team = await Team.findById(req.body.teamId);

      if (!team) return res.status(404).send({ message: "Team not found" });

      // Add the new player to the team's players array
      team.players.push(player?._id);
      await team.save();
      res.status(201).send(player);
    } catch (error) {
      res.status(400).send(error);
    }
  }
);

// Schedule the task to run every Monday at 00:01
cron.schedule("1 0 * * 1", async () => {
  try {
    const bestPlayers = await getBestPlayersOfWeek();
    console.log("Best players of the previous week updated:", bestPlayers);
    // Here you can add logic to store these results or perform any other actions
  } catch (error) {
    console.error("Error updating best players of the previous week:", error);
  }
});

module.exports = router;
