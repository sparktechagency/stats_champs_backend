const express = require("express");
const router = express.Router();
const Team = require("../../models/Team");
const SportType = require("../../models/SportType");

const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");

// @route    POST api/teams/ (name, logo, sportsType)
// @desc     Create a new team for admin
// @access   Private
router.post(
  "/",
  check("name", "Team name is required").notEmpty(),
  check("sportsType", "Sports type is required").notEmpty(),
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

      const team = new Team({
        name: req.body.name,
        logo: req.body.logo,
        sportsType: sportType._id,
      });
      await team.save();
      res.status(201).send(team);
    } catch (error) {
      res.status(400).send(error);
    }
  }
);

// @route    GET api/teams/
// @desc     Get all teams for admin
// @access   Private

router.get("/", auth, async (req, res) => {
  try {
    const pageSize = parseInt(req.query.size) || 15; // Number of teams per page
    const page = parseInt(req.query.page) || 1; // Current page
    const search = req.query.search || ""; // Search query

    // Fetch the sportType by name
    const sportType = await SportType.findOne({ name: req.query.sportsType });
    if (!sportType)
      return res.status(404).send({ message: "Sports Type not found" });

    // Build the query
    const query = {
      sportsType: sportType._id,
      activated: true,
      name: { $regex: search, $options: "i" }, // Search by name
    };

    const count = await Team.countDocuments(query);
    const teams = await Team.find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    res.send({
      teams: teams.map((team) => ({
        ...team._doc,
        sportsType: req.query.sportsType,
      })),
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      pageSize,
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    GET api/teams/:id
// @desc     Get a teams by ID for admin
// @access   Public

router.get("/:id", auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).send();
    res.send(team);
  } catch (error) {
    res.status(500).send(error);
  }
});

// @route    PATCH api/teams/:id
// @desc     Update a team by ID for admin
// @access   Public

router.patch("/:id", auth, async (req, res) => {
  try {
    if (req.body.sportsType) {
      const sportType = await SportType.findOne({ name: req.body.sportsType });
      if (!sportType)
        return res.status(404).send({ message: "Sports Type not found" });
      req.body.sportsType = sportType._id;
    }
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!team) return res.status(404).send();
    res.send(team);
  } catch (error) {
    res.status(400).send(error);
  }
});

// @route    DELETE api/teams/:id
// @desc     Delete a team by ID for admin
// @access   Public

router.delete("/:id", auth, async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(
      req.params.id,
      { activated: false },
      { new: true }
    );
    if (!team) return res.status(404).send();
    res.send(team);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
