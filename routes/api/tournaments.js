const express = require("express");
const router = express.Router();
const Tournament = require("../../models/Tournament");
const Game = require("../../models/Game");
const { check, validationResult } = require("express-validator");
const SportType = require("../../models/SportType");
const auth = require("../../middleware/auth");
const { Types } = require("mongoose");
const { pipeline } = require("stream");
const GameResult = require("../../models/GameResult");
const moment = require("moment");

// @route    POST api/tournaments/
// @desc     Create a new tournament
// @access   Private
router.post(
  "/", 
  check("sportsType", "Sports Type is required").notEmpty(),
  check("name", "Tournament Name is required").notEmpty(),
  check("startDate", "Start Date is required").notEmpty(),
  check("endDate", "End Date is required").notEmpty(),
  auth,
  async (req, res) => {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      // Fetch the sportType by name
      const sportType = await SportType.findOne({ name: req.body.sportsType });
      if (!sportType)
        return res.status(404).send({ message: "Sports Type not found" });
      // Create a new tournament
      const tournament = new Tournament({
        photo: req.body.photo,
        sportsType: sportType._id,
        name: req.body.name,
        startDate: req.body.startDate,
        details: req.body.details,
        endDate: req.body.endDate,
      });
      await tournament.save();
      res.status(201).json(tournament);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.delete("/:id", auth, async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndDelete(req.params.id);
    if (!tournament)
      return res.status(404).send({ message: "Tournament not found" });
    res.status(200).json({ message: "Tournament deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// @route    GET api/tournaments/
// @desc     Get all tournaments by sport type
// @access   Public
router.get("/", auth, async (req, res) => {
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

    if (search) {
      query.name = { $regex: search, $options: "i" }; // Case-insensitive search
    }
    if (req.query.startDate) {
      const startOfDay = moment(req.query.startDate).startOf("day").toDate();
      const endOfDay = moment(req.query.startDate).endOf("day").toDate();
      query.startDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const count = await Tournament.countDocuments(query);
    const tournaments = await Tournament.find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .sort({ _id: -1 });

    res.send({
      tournaments: tournaments.map((tournament) => ({
        ...tournament._doc,
        sportsType: req.query.sportsType,
      })),
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      pageSize,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route    GET api/tournaments/:id
// @desc     Get a tournament by ID
// @access   Private
router.get("/:id", auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate(
      "games"
    );
    if (!tournament)
      return res.status(404).send({ message: "tournament not found" });
    res.status(200).json(tournament);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route    PATCH api/tournaments/id
// @desc     Update tournament state
// @access   Public

router.patch("/:id", auth, async (req, res) => {
  try {
    if (req.body.sportsType) {
      const sportType = await SportType.findOne({ name: req.body.sportsType });
      if (!sportType)
        return res.status(404).send({ message: "Sports Type not found" });
      req.body.sportsType = sportType._id;
    }
    const updatedTournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    // io.emit('updatedTournament', req.params.id); // Notify all clients about game update
    res.status(200).json(updatedTournament);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route    GET api/tournament/games/:tournamentId
// @desc     Get all game by tournamentId
// @access   Public
router.get("/games/:tournamentId", auth, async (req, res) => {
  try {
    const games = await Game.find({ tournamentId: req.params.tournamentId });
    console.log(games.length);
    res.status(200).json(games);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// router.get("/top-player/:tournamentId", auth, async (req, res) => {
//   console.log(req.params);
//   try {
//     const pipeline = [
//       {
//         $match: {
//           _id: new Types.ObjectId(req.params.tournamentId),
//         },
//       },
//       {
//         $lookup: {
//           from: "games",
//           localField: "games",
//           foreignField: "_id",
//           as: "games",
//         },
//       },
//       {
//         $unwind: "$games", // Flatten the games array if necessary
//       },
//       {
//         $unwind: "$games.teams", // Unwind the teams array to work with individual team stats
//       },
//       {
//         $lookup: { 
//           from: "players",
//           localField: "games.teams.players.player",
//           foreignField: "_id",
//           as: "players",
//         },
//       },

//       {
//         $unwind: "$players", // Unwind the teams array to work with individual team stats
//       },
//       {
//         $project: {
//           "games.teams.teamName": 1,
//           "games.teams.players.photo": "$players.photo",
//           "games.teams.players.stats.PTS": 1,
//           "games.teams.players.name": 1,
//           "games.teams.players.stats.FGM": 1,
//           "games.teams.players.stats.FGA": 1,
//           "games.teams.players.stats.3PM": 1,
//           "games.teams.players.stats.3PA": 1,
//           "games.teams.players.stats.REB": 1,
//           "games.teams.players.stats.AST": 1,
//         },
//       },
//       {
//         $sort: {
//           "games.teams.players.stats.PTS": -1, // Sort by points to get the top player
//         },
//       },
//       {
//         $group: {
//           _id: "$games._id",
//           topPlayer: { $first: "$games.teams.players" }, // Get the top player based on points
//         },
//       },
//       {
//         $project: {
//           "topPlayer.name": 1,
//           "topPlayer.photo": 1,
//           "topPlayer.stats.PTS": 1,
//           "topPlayer.stats.FGM": 1,
//           "topPlayer.stats.FGA": 1,
//           "topPlayer.stats.3PM": 1,
//           "topPlayer.stats.3PA": 1,
//           "topPlayer.stats.REB": 1,
//           "topPlayer.stats.AST": 1,
//         },
//       },
//     ];

//     const nn = await Tournament.aggregate(pipeline); 



//     res.status(200).json(nn);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// });


router.get("/top-player/:tournamentId", auth, async (req, res) => {
  try {
    const result = await Tournament.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(req.params.tournamentId),
        },
      },
      {
        $lookup: {
          from: "games",
          localField: "games",
          foreignField: "_id",
          as: "games",
        },
      },
      { $unwind: "$games" },
      { $unwind: "$games.teams" },
      { $unwind: "$games.teams.players" },

      // Flatten game+player into root level
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$games.teams.players", { gameId: "$games._id" }],
          },
        },
      },

      // Join player details
      {
        $lookup: {
          from: "players",
          localField: "player",
          foreignField: "_id",
          as: "playerDetails",
        },
      },
      {
        $unwind: "$playerDetails",
      },

      // Group by player
      {
        $group: {
          _id: "$player",
          name: { $first: "$playerDetails.name" },
          photo: { $first: "$playerDetails.photo" },
          teamId: { $first: "$playerDetails.teamId" },
          sportsType: { $first: "$playerDetails.sportsType" },
          country: { $first: "$playerDetails.country" },
          totalPTS: { $sum: "$stats.PTS" },
          totalFGM: { $sum: "$stats.FGM" },
          totalFGA: { $sum: "$stats.FGA" },
          total3PM: { $sum: "$stats.3PM" },
          total3PA: { $sum: "$stats.3PA" },
          totalREB: { $sum: "$stats.REB" },
          totalAST: { $sum: "$stats.AST" },
          totalSTL: { $sum: "$stats.STL" },
          totalBLK: { $sum: "$stats.BLK" },
          totalTO: { $sum: "$stats.TO" },
          totalPF: { $sum: "$stats.PF" },
          totalOREB: { $sum: "$stats.OREB" },
          totalDREB: { $sum: "$stats.DREB" },
          totalMIN: { $sum: "$stats.MIN" },
          gamesPlayed: { $sum: 1 },
        },
      },

      // Derived calculations
      {
        $addFields: {
          PPG: { $round: [{ $divide: ["$totalPTS", "$gamesPlayed"] }, 2] },
          RPG: { $round: [{ $divide: ["$totalREB", "$gamesPlayed"] }, 2] },
          APG: { $round: [{ $divide: ["$totalAST", "$gamesPlayed"] }, 2] },
          FGPercent: {
            $round: [
              {
                $cond: {
                  if: { $eq: ["$totalFGA", 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      { $divide: ["$totalFGM", "$totalFGA"] },
                      100,
                    ],
                  },
                },
              },
              1,
            ],
          },
          "3PPercent": {
            $round: [
              {
                $cond: {
                  if: { $eq: ["$total3PA", 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      { $divide: ["$total3PM", "$total3PA"] },
                      100,
                    ],
                  },
                },
              },
              1,
            ],
          },
        },
      },

      // Sort by PPG
      { $sort: { PPG: -1 } },
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error("🔥 Error fetching top players:", error);
    res.status(500).json({ message: "Server error", error });
  }
});


router.get("/team-standing/:tournamentId", auth, async (req, res) => {
  console.log(req.params);
  try {
    const pipeline = [
      {
        $match: {
          tournamentId: new Types.ObjectId(req.params.tournamentId),
        },
      },
      {
        $facet: {
          wins: [
            {
              $group: {
                _id: "$winnerTeamId", // Group by winnerTeamId
                winCount: { $sum: 1 }, // Count wins
              },
            },
            {
              $lookup: {
                from: "teams", // Join the Team collection
                localField: "_id", // Match _id with winnerTeamId
                foreignField: "_id", // Match with the _id field of Team collection
                as: "teamDetails", // Output the team details
              },
            },
            {
              $unwind: "$teamDetails", // Flatten the teamDetails array
            },
            {
              $project: {
                teamName: "$teamDetails.name", // Get the team name
                teamLogo: "$teamDetails.logo", // Get the team logo
                winCount: 1, // Include win count
              },
            },
          ],
          losses: [
            {
              $group: {
                _id: "$looserTeamId", // Group by looserTeamId
                lossCount: { $sum: 1 }, // Count losses
              },
            },
            {
              $lookup: {
                from: "teams", // Join the Team collection
                localField: "_id", // Match _id with looserTeamId
                foreignField: "_id", // Match with the _id field of Team collection
                as: "teamDetails", // Output the team details
              },
            },
            {
              $unwind: "$teamDetails", // Flatten the teamDetails array
            },
            {
              $project: {
                teamName: "$teamDetails.name", // Get the team name
                teamLogo: "$teamDetails.logo", // Get the team logo
                lossCount: 1, // Include loss count
              },
            },
          ],
        },
      },
      {
        $project: {
          wins: 1,
          losses: 1,
        },
      },
    ];

    const data = await GameResult.aggregate(pipeline);

    let mergedData = [...data[0].wins, ...data[0].losses];
    // Find the team in the accumulator

    let finalData = mergedData.reduce((acc, current) => {
      let team = acc.find((t) => t.teamName === current.teamName);

      if (team) {
        // Update existing team's winCount or lossCount
        if (current.winCount !== undefined) {
          team.winCount += current.winCount;
        }
        if (current.lossCount !== undefined) {
          team.lossCount += current.lossCount;
        }
      } else {
        // Add a new team if not found
        acc.push({
          teamName: current.teamName,
          teamLogo: current.teamLogo,
          winCount: current.winCount || 0,
          lossCount: current.lossCount || 0,
        });
      }
      return acc;
    }, []);

    res.status(200).json(finalData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
